(function($) { 
	$(function() {
		var view_block = $('.view_block');
		$(document)
        .on('click','.screenshots',function(e){
        	view_block.hide();
        	$('.screenshots-block').toggle();
        })
        .on('click','.fb_image',function(e){
        	view_block.hide();
        	$('.fb_image-block').toggle();
        })
        .on('click','.description',function(e){
        	view_block.hide();
        	$('.description-block').toggle();
        })
         .on('click','.links_404',function(e){
         	view_block.hide();
        	$('.links_404-block').toggle();
        })
         .on('click','.links_empty',function(e){
         	view_block.hide();
        	$('.links_empty-block').toggle();
        })
         .on('click','.images_alt',function(e){
         	view_block.hide();
        	$('.images_alt-block').toggle();
        })
         .on('click','.images_char',function(e){
         	view_block.hide();
        	$('.images_char-block').toggle();
        });

       

        



	var done;
	var ws = new WebSocket('ws://localhost:40510');
	// event emmited when connected
	ws.onopen = function () {
	console.log('websocket is connected ...')

	// sending a send event to websocket server
	ws.send( JSON.stringify ({ connect: 'connect' }) )
	}
	// event emmited when receiving message 
	ws.onmessage = function (ev) {

		
		add_to_screen(ev.data)
	}


	$('form').on('submit',makeRequest);
	function makeRequest(e){

		var url = $('#url').val();

		if	(url!== ""){
			$('form').slideUp();
			$('.output').append('checking site');
			$('.output').fadeIn();
			ws.send( JSON.stringify ({ url:url }) );
		}
		
		e.preventDefault();
		
	}
	function add_to_screen(msg){
		
		console.log('mes-org',msg);
	 	let massage = JSON.parse(msg);
		console.log('edit',massage);
		switch (massage.check ) {
			case 'check':
				$( '<span>'+ massage.msg +'</span>').prependTo( ".output" );
				break;
			case 'check-f':
				$( '<span class="red">'+ massage.msg +'</span>').prependTo( ".output" );
				break;
			case 'done':
				if (!done) {
					done = true;
						console.log('DOOOONEt',JSON.parse(massage.msg));
					$( '<span class="red"> Test is completed</span>').prependTo( ".output" );

					var data= $('#url').val().replace(/http?:\/\//i, "");

					console.log(data);
					setTimeout(function(){

						var urltogo = String( $('#url').val()  ).replace( 'http://', "" ).replace('https://', "" );
						document.location.href = document.location.href  +  'testrunner/' + urltogo

					 }, 2000);

					 
				}
				break;
			default:
				console.log(massage)
				
		}
	}




	});
})(jQuery);


