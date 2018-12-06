const puppeteer = require('puppeteer');
const urlExists = require('url-exists-async-await');
const validator = require('html-validator');

let page;
let browser;
//Main Rapport
let rapport=[]

//Rapport generator
let RP={
	add: function(key, massage){
		if(!rapport[key]  && typeof rapport[key] == 'undefined' ) {
			rapport[key] = [];
		}
		rapport[key].push(massage);
	}
};

//test runner
var TR = {
 
	rapport: [],
 
	screenshot: async function(url) {
		
		//ToDO
		// Save them in the right folder
		await page.screenshot({path: url.title + '.png'});
		// TODO Show massage

	},
	img_check: async function(strings){

		var regex1 = /[%öäåÖÄÅ]/g;
		var regex2 = /[^data:image]+$/g;

		for (var i = 0; i < strings.length; i++) {
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

		for (var i = 0; i < links.length; i++) {
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

//Collector
var CL = {
	nav: async function(){
		return result = await page.evaluate(() => {
			try {
				var data = [];
				$('.navigation__primary li').each(function() {
					const url = $(this).find('a').attr('href');
					const title = $(this).find('a').text();
					data.push({
						'title' : title,
						'url'   : url
					});
				});
				return data; // Return our data array
			} catch(err) {
				reject(err.toString());
			}
		});

	},
	img: async function(){
		return await page.evaluate(() => {
			try {
				
				// check <img>
				var img = [];
				$('img').each(function() {

					let url = $(this).attr('src');
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

				return img; // Return our data array

			} catch(err) {
				console.log(err);
			}
		});
	},
	links: async function(){
		return await page.evaluate(() => {
			try {
				
				// check <a>
				var links = [];
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

	await page.goto(domain);
	await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.2.1.min.js'})

	//get navigation meny
	let nav = await CL.nav();

	//validate html
	await TR.validate_html(domain);

	//loop navigation
	for (var i = 0; i < nav.length; i++) {

		//change page
		 //await page.goto(result[i].url);

		//  //take screenshots
		// await TR.screenshot(result[i]);

		// //collect images 
		// let image_list = await CL.img();

		// //check images
		// await TR.img_check(image_list);
		
		// await TR.meta();

		// let links = await CL.links();
		// console.log(links);
		// await TR.links(links);

	
	}

	console.log(rapport);
	browser.close()
}


//start
run('http://t1.gg-dev.se/');



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
	var s= sstring.replace(/\\/g, '/');
	s= s.substring(s.lastIndexOf('/')+ 1);
	return extension? s.replace(/[?#].+$/, ''): s.split('.')[0];
}
