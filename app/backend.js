let page,
  browser,
  current_page = "home",
  defaul_navigation = '.navigation__primary li',
  rapport = [], //Main Rapport
  args = process.argv.slice(2),
  input_url = args[0];


// if (args.length == 0) {
//  console.log('No URL input');
//  process.exit()
// }

// if (args.length >= 2) {
//  console.log('Using custom navigation scope');
//  defaul_navigation = args[1]
// }




//Rapport generator
let RP={
  add: function(key, massage){

    if(!rapport[current_page]  && typeof rapport[current_page] == 'undefined' ) {
      rapport[current_page]= [] 
    }
    if(!rapport[current_page][key]  && typeof rapport[current_page][key] == 'undefined' ) {
      rapport[current_page][key] = [];
    }
    rapport[current_page][key].push(massage);
  }
};

//test runner
let TR = {
 
  rapport: [],
 
  screenshot: async function(url) {
    
    //ToDO
    // Save them in the right folder
    await page.screenshot({path: url.title + '.png'});
    // TODO Show massage

  },
  img_check: async function(strings){

    let regex1 = /[%öäåÖÄÅ]/g;
    let regex2 = /[^data:image]+$/g;

    for (let i = 0; i < strings.length; i++) {
      if (strings[i].url.match(regex1) && !strings[i].url.match(regex2) ) { 
        RP.add('img_char', strings[i].url );
      }
      if (strings[i].alt == '') {
        RP.add('img_alt', strings[i].url );
      }
    }
  },
  meta: async function(){

    let description,FB_image;

    // chekc meta desciption
    try{
      description = await page.$eval("head > meta[name='description']", element => element.content);
      RP.add('Description', description);
    }
    catch(err){
      RP.add('Description', "!! Description not find");
    }
    // Chekc FB image
    try{
      FB_image =  await page.$eval("head > meta[property='og:image']" , element => element.content);
      RP.add('FB_image', FB_image)
    }
    catch(err){
      RP.add('FB_image', '!! og:image not find');
    }
  },
  links: async function(links){

    for (let i = 0; i < links.length; i++) {
      //check for empty links
      if ( links[i].url == '' ) {
        RP.add('links_empty', '!! Empty link on : ' + links[i].title  );
      }
      
      //check for 404
      else{
        link_is_ok = await urlVal(links[i].url);
        if (!link_is_ok ) {
          RP.add('links_404', '!! 404 link on : ' + links[i].title + ' url:' + links[i].url );
        }
      }
    }
  },
  validate_html: async function(url){
    //HTML check
    let json = await validator({
      url: url
    });
    RP.add('HTML_validate', json );
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
        console.log(err);
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
        return img;
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
        console.log('err');
        console.log(err);
      }
    });
  }
}

//Main run function
async function run(domain) {
   browser = await puppeteer.launch({ headless: true });

  page = await browser.newPage();

  await page.goto(domain,{waitUntil: 'networkidle2'});
  await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.2.1.min.js'})

  //get navigation meny
  let nav = await CL.nav();

  //validate html
  await TR.validate_html(domain);
  await TR.meta();

  //loop navigation
  for (let i = 0; i < nav.length; i++) {
    current_page = result[i].title;
    //change page
    await page.goto(result[i].url,{waitUntil: 'networkidle2'});
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.2.1.min.js'})

    //take screenshots
    await TR.screenshot(result[i]);

    //collect images & check images
    let image_list = await CL.img();
    await TR.img_check(image_list);

    //check links &check links
    let links = await CL.links();
    await TR.links(links);
  
  }

  console.log(rapport );
  browser.close()
}

//helper
const urlVal = async(data) => {
  console.log('checking', data);
  try {
    const result = await urlExists(data);
    return result;
  } catch(err) {
    console.log(err);
  }
}
//helper
let filename=function(sstring, extension){
  let s= sstring.replace(/\\/g, '/');
  s= s.substring(s.lastIndexOf('/')+ 1);
  return extension? s.replace(/[?#].+$/, ''): s.split('.')[0];
}