var express = require('express');
var router = express.Router();
const puppeteer = require('puppeteer');
const urlExists = require('url-exists-async-await');
const validator = require('html-validator');
var fs = require('fs');


/* GET users listing. */
router.get('/', function(req, res, next) {
	res.send('respond with a resource2');
});

router.get('/:slug', function(req, res, next) {
	console.log();
	let file = './public/uploads/' + req.params.slug + '/data.json';

	var rapport= JSON.parse(fs.readFileSync(file, 'utf8'));

	console.log('rapport',rapport);

	res.render('overview.pug', { rapport: rapport});
});

module.exports = router;
