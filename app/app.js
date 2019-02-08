var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const puppeteer = require('puppeteer');
const urlExists = require('url-exists-async-await');
const validator = require('html-validator');
var fs = require('fs');

var indexRouter = require('./routes/index');
var testRouter = require('./routes/testrunner');

var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/media', express.static(path.join(__dirname, 'public')));

app.use('/testrunner', testRouter);
app.use('/', indexRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


var WebSocketServer = require('ws').Server,
wss = new WebSocketServer({port: 40510})

let page,
  browser,
  current_page = "BL_home",
  defaul_navigation = '.navigation__primary li',
  args = process.argv.slice(2),
  input_url = args[0],
  full_domain;

//if run from command line 
// if (args.length == 0) {
//  console.log('No URL input');
//  process.exit()
// }

// if (args.length >= 2) {
//  console.log('Using custom navigation scope');
//  defaul_navigation = args[1]
// }



wss.getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
}

wss.on('connection', function (ws) {
	ws.id = wss.getUniqueID();
	//User connected
	ws.on('message', async function (message) {
    console.log('message=',message)
    let body;
    try {
      body = JSON.parse(message);
      
    } catch(e) {
     
        console.log('e',e); 
    }
		if (typeof body !== 'undefined' ) {

      if (typeof body.connect !== 'undefined') {
          console.log('User Connected');
       
      }
      if (typeof body.url !== 'undefined') {
          await run(body.url, ws);

         send_data('done',JSON.stringify(rapport),ws);
         save_json(rapport);
        
      }
      
      //console.log('rapport',rapport);
    }
    else{
      console.log('----')
    }

  })
});


let rapport = {}; //Main Rapport
rapport.result = {};
// global overview
rapport.BQATR = {};
rapport.BQATR.SC= 0;
rapport.BQATR.image_char = 0;
rapport.BQATR.image_alt = 0;
rapport.BQATR.links_404 = 0;
rapport.BQATR.links_empty= 0;
rapport.BQATR.meta_description =  0;
rapport.BQATR.meta_fb_img = 0;
rapport.BQATR.validate_html = 0;

//Rapport generator
let RP={
  add: function(key, massage, addtomain){

  switch (key ) {
    case 'img_char':
      rapport.BQATR.image_char++
      break;
    case 'img_alt':
      rapport.BQATR.image_alt++
      break;
    case 'Description':
     if (massage === 0) {
        rapport.BQATR.meta_description++
      }
      break;
    case 'fb_img':
     if (massage === 0) {
        rapport.BQATR.meta_fb_img ++
      }
      break;
    case 'links_empty':
      rapport.BQATR.links_empty++
      break;
    case 'links_404':
      rapport.BQATR.links_404 ++
      break;
    case 'HTML_validate':
      rapport.BQATR.validate_html ++
      break;
    case 'SC':
      rapport.BQATR.SC++;
      break;
  }
  if (addtomain) {

    rapport.BQATR[key]=  massage;
    return;
  }
    if(!rapport.result[current_page]  && typeof rapport.result[current_page] == 'undefined' ) {
          rapport.result[current_page]= {}
    }
    if (!rapport.result[current_page][key]  && typeof rapport.result[current_page][key] == 'undefined' ) {
        rapport.result[current_page][key]= []

    }
    rapport.result[current_page][key].push(massage);
  }
};

const save_json = function (json){

 dir = './public/uploads/' + full_domain.replace(/http?:\/\//i, "");
      if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
      }

   fs.writeFile(dir + '/data.json', JSON.stringify(rapport, null, 2) , 'utf-8');

}

//test runner
let TR = {
 
  rapport: [],
 
  screenshot: async function(url,ws) {

      let dir = './public/uploads';
      if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
      }

      dir = './public/uploads/' + full_domain.replace(/http?:\/\//i, "");
      if (!fs.existsSync(dir)){
          fs.mkdirSync(dir);
      }

      send_data('check',' screenshoting '+ url.title ,ws);

      let file_url= dir +'/' +  url.title +  Date.now() + '.png';
      await page.screenshot({path:file_url});
      RP.add('SC', file_url.substr(8));

  },
  img_check: async function(strings,ws){

    let regex1 = /[%öäåÖÄÅ]/g;
    let regex2 = /[^data:image]+$/g;

    for (let i = 0; i < strings.length; i++) {

      send_data('check',' images '+ strings[i].url ,ws);

      if (strings[i].url.match(regex1) && !strings[i].url.match(regex2) ) { 
        RP.add('img_char', strings[i].url );
      }

      if (strings[i].alt == '') {
        RP.add('img_alt', strings[i].url );
      }
    }
  },
  meta: async function(ws){

    let description,FB_image;
    send_data('check','Checking metas: ' ,ws);
    // chekc meta desciption
    try{
      description = await page.$eval("head > meta[name='description']", element => element.content);
      RP.add('Description', description , 1);
    }
    catch(err){
      RP.add('Description', 0 , 1);
      send_data('check-f',' Description not find' ,ws);
    }
    // Chekc FB image
    try{
      FB_image =  await page.$eval("head > meta[property='og:image']" , element => element.content);
      RP.add('fb_img', FB_image , 1)
    }
    catch(err){
      RP.add('fb_img', 0 , 1);
      send_data('check-f',' Facebook Share image not find' ,ws);
    }
  },
  links: async function(links,ws){

    for (let i = 0; i < links.length; i++) {
      //check for empty links
      if ( links[i].url == '' ) {
        RP.add('links_empty', '!! Empty link on : ' + links[i].title  );
      }
      else{
        send_data('check','Checking links: ' + links[i].url ,ws);
        link_is_ok = await urlVal(links[i].url);
        if (!link_is_ok ) {
          send_data('check-f','404 link on: ' + links[i].url ,ws);
          RP.add('links_404', '404 link on : ' + links[i].title + ' url:' + links[i].url );
        }
      }
    }
  },
  validate_html: async function(url,ws){
    //HTML check
    send_data('check',' Validating HTML on' + url ,ws);
    let json = await validator({
      url: url
    });
    RP.add('HTML_validate', JSON.parse(json) , 1);
  }
};
let all ="1" ;
//Collector
let CL = {
  nav: async function(){
    return result = await page.evaluate((defaul_navigation) => {
      try {
        let data = [];
        $(defaul_navigation).each(function() {
          const url = $(this).find('a').attr('href');
          const title = $(this).find('a').text();
          data.push({
            'title' : title,
            'url'   : url
          });
        });
        return data; // Return our data array
      } catch(err) {
        console.log('nav',err);
      }
    },defaul_navigation);

  },
  img: async function(){
    return await page.evaluate(() => {
      try {
        
        // check <img>
        var img = [];
        $('img').each(function() {

          var url = $(this).attr('src');
          if (url.indexOf('data:image/gif')==0) {
            url =  $(this).prop('currentSrc');
          }

          img.push({
            url : url,
            alt:  $(this).attr('alt'),
          });
        });
        
        //check bg images
        var bg_sec = $('section, div').filter(function(){
          return this.style.backgroundImage != ''
        });

        for (var i = 0; i < bg_sec.length; i++) {
          
          img.push({
            url :  $(bg_sec[i]).css('background-image').split(/"/)[1],
            alt: "bg-image"
          });
        }
        all = "err";
        return img; // Return our data array
      } catch(err) {
        return err;
      }
    });
  },
  links: async function(){
    return await page.evaluate(() => {
      try {
        
        // check <a>
        let links = [];
        $('a').each(function() {

          const title = $(this).text();
          const url =  $(this).attr('href');
          
          if (title !== "" && url !== '/' && url.indexOf('#')!=0 ) {

            links.push({
              'title' : title,
              'url'   : url
            });
          }
        });
        return links; // Return our data array
      } catch(err) {
        console.log('links',err);
      }
    });
  }
}




//Main run function
async function run(domain,ws) {
  full_domain = domain;
  send_data('check','Checking domain: ' + domain ,ws);
  


  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768});

  await page.goto(domain,{waitUntil: 'networkidle2'});
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.2.1.min.js'})

  //get navigation meny
  let nav = await CL.nav();

  //check meta data
  await TR.meta(ws);

  //validate html
  //await TR.validate_html(domain,ws);
 

  //loop navigation
  for (let i = 0; i < nav.length; i++) {


    current_page = nav[i].title;
    //change page
    await page.goto(nav[i].url,{waitUntil: 'networkidle2'});
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.2.1.min.js'})

    //take screenshots
    await TR.screenshot(nav[i],ws);

    //collect images & check images
    let image_list = await CL.img();
    await TR.img_check(image_list, ws);

    // //check links &check links
    let links = await CL.links();
    await TR.links(links,ws);
  
  }
  browser.close();
}

//helper
const urlVal = async(data) => {
  try {
    const result = await urlExists(data);
    return result;
  } catch(err) {
    console.log('url',err);
  }
}
//helper
let filename=function(sstring, extension){
  let s= sstring.replace(/\\/g, '/');
  s= s.substring(s.lastIndexOf('/')+ 1);
  return extension? s.replace(/[?#].+$/, ''): s.split('.')[0];
}

const send_data =  function(status,msg,ws){

  let data= {check: status, msg : msg}
  ws.send(JSON.stringify(data));
  console.log('data',data);

}

