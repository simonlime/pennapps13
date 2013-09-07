$(document).ready(function() {

    filepicker.setKey('ABSoo9CfZQdC5cZB6dJGdz');

    $('#upload').on('click', function() {
        filepicker.pickAndStore({},{}, function(data) {
            console.log(JSON.stringify(data));
            $('#url').html(data[0].url);
            // // $('#url').html(data[0].url)
        });
    });
});
