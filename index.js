  ////////////////////////////////
 ///  FACE FINDER with OpenCV ///
////////////////////////////////
var child_process = require('child_process');
var fs = require('fs');
var crypto = require('crypto');
var stream = require('stream');
var path = require('path');
var AWS = require('aws-sdk');
var async = require('async');
var config = require('./config.json');
var tempDir = process.env['TEMP'] || '/tmp';
var uuid = require('node-uuid');
var cv = require('opencv');
var params = [];

function detectFaces(im, callback) {
	var self = this;
	self.listOfFaces = [];

	im.detectObject('haarcascade_frontalface_alt.xml', {}, function (err, faces) {
		if (err) throw err;
		var imgWidth = im.width();
		var imgHeight = im.height();
		for (var i = 0; i < faces.length; i++) {
			face = faces[i];
			let widthRatio = (face.width / imgWidth) * 1000;
			if (widthRatio > 500) { face.distance = 1; }
			if (widthRatio > 300 && widthRatio <= 500) { face.distance = 2; }
			if (widthRatio > 200 && widthRatio <= 300) { face.distance = 3; }
			if (widthRatio > 150 && widthRatio <= 200) { face.distance = 4; }
			if (widthRatio > 75 && widthRatio <= 150) { face.distance = 5; }
			if (widthRatio > 38 && widthRatio <= 75) { face.distance = 6; }
			if (widthRatio > 18 && widthRatio <= 38) { face.distance = 7; }
			if (widthRatio <= 18) { face.distance = 8; }
			face.headX = face.x- face.width*(.125);
			if (face.headX<0){face.headX=0;}
			face.headY = face.y- face.height*(.325);
			if (face.head<0){face.head.y=0;}
			face.headWidth = face.width*1.25;
			if (face.headX+face.headWidth>imgWidth){face.headWidth=imgWidth-face.headX;}
			face.headHeight = face.height*1.75;
			if (face.headY+face.headHeight>imgHeight){face.headHeight=imgHeight-face.headY;}

			face.base64 = im.roi(face.headX, face.headY, face.headWidth, face.headHeight).toBuffer().toString("base64");

			self.listOfFaces.push(face);
		}
		
		callback(null, self.listOfFaces);

	});
}

function processImage(imageBase64, cb) {
	async.series([
		function (cb) {
			cv.readImage(new Buffer(imageBase64, 'base64'), function (err, im) {
				detectFaces(im, cb);
			});
		}
	], cb);
}

exports.handler = function (event, context, callback) {
	if (event.body !== null && event.body !== undefined) {
		let body = event.body;
	}
	var format = config.format;

	async.series([
		function (cb) { processImage(event.body, cb); }
	], function (err, results) {
		if (err) {
			context.fail(err);
		}
		else {
			var response = {
				"statusCode": 200,
				"body": JSON.stringify(results[0][0], 4),
				"isBase64Encoded": false
			};
			context.succeed(response)
		};
	});
};
