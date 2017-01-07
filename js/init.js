var should_load = new Array();
$(document).ready(function(){

	// init foundation
	$(document).foundation();

	// smooth scroll
	$(".main-navigation a").click(function(e){
		var _id = $(this).attr('href').split('#');
		_id = _id[1];
		var _el = $("section[name='"+_id+"']");
		if(_el.length == 0)
			return true;
		e.preventDefault();
		$(window).scrollTo(_el,500,{
			offset: { top: 0 - $("#top-bar").height() + 2 },
			easing: 'easeInOutCubic'
		});
	});
	$(".main-navigation .menu-handler a").off('click').click(function(e){
		e.preventDefault();
	});

	// initial loader
	$("body img").each(function(){
		var _src = $(this).attr('src');
		if(_src != '')
			should_load[should_load.length] = _src;
	});
	$.when(loadImages()).done(function(){
		$("#loading").fadeOut(1500);
	});

	$(".lightmybox").lightmybox();

	$(".lightmybox2").lightmybox({
		bg: 'color',
		color: 'auto',
		callbacks: {
			beforeShow: function() { console.log('beforeShow'); },
			afterShow: 	function() { console.log('afterShow'); },
			beforeNext: function() { console.log('beforeNext'); },
			afterNext: 	function() { console.log('afterNext'); },
			beforePrevious: function() { console.log('beforePrevious'); },
			afterPrevious: 	function() { console.log('afterPrevious'); },
			beforeClose: function() { console.log('beforeClose'); },
			afterClose: 	function() { console.log('afterClose'); },
		}
	});

	$(".lightmybox3").lightmybox({
		bg: 'color',
		color: '#e53737'
	});
	
	$(".lightmybox4").lightmybox({
		bg: 'pixelate'
	});

	$(".lightmybox5").lightmybox({
		mode: 'single'
	});

	$(".lightmybox6").lightmybox({
		theme: 'light'
	});

	$(".lightmybox7").lightmybox({
		bgOpacity: 1,
		frame: false
	});

	$(".lightmybox8").lightmybox({
		height: 'fullscreen'
	});
});

// This function loads images
var loadImages = function() {
	return $.Deferred(
		function(dfd) {
			var total_images 	= should_load.length;
			var loaded			= 0;
			for(var i = 0; i < total_images; ++i){
				$('<img/>').load(function() {
					++loaded;
					// Find percent and update bar
						var _w = (100 * loaded / total_images) + '%';
						$("#loading-bar > span").stop()
						.animate(
							{ width: _w },
							function(){
								if(loaded === total_images)
									dfd.resolve();
							}
						);
					// ---------------------------
				}).attr('src' , should_load[i]);
			}
		}
	).promise();
};