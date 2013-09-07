var request = require('request');

exports.index = function(req, res) {
	//find all the files linked to that user and pass them on to the template
	res.render('index');
}

exports.postSong = function(req, res) {
    request.post('http://developer.echonest.com/api/v4/track/upload',
        { form: { api_key: 'U3MVIBVCJOK2TKRBZ', url: req.body.url } }, function (error, data, json) {
        
        json = JSON.parse(json);
        request.get('http://developer.echonest.com/api/v4/track/profile?api_key=U3MVIBVCJOK2TKRBZ&format=json&id=' + json['response']['track']['id'] + '&bucket=audio_summary', null, function (error, data, json) {
            json = JSON.parse(json);
            request.get(json['response']['track']['audio_summary']['analysis_url'], null, function (error, data, json) {
                json = JSON.parse(json);
                //console.log(json);
                res.send(json);
            });
        });
    });
}