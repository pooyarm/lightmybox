/*
 * LightMyBox v1
 * http://pooyarm.github.io/LightMyBox/
 *
 * Created by Pooya Rostam
 * http://1pooya.com/
 * https://github.com/pooyarm
 */
 (function ( $ ) {
    "use strict";
	$.fn.lightmybox = function( _options ) {
		var that = this;
		var wrapper = false;
		var loading = false;
		var activeIndex = 0;
		var lockBtns = false;
		var CONST_OFFSET = 50;
		this.images = [];
		this.imageWidth = 0;
		this.imageHeight = 0;
		this.li = {prev:false,current:false,next:false};
		this.uniqueClass = 'lightmybox_' + Math.floor(Math.random() * 26) + Date.now();

		this.options = $.extend({
			// These are the defaults.
			mode: 'slideshow', // single | slideshow
			bg: 'image', // color | image | pixelate
			color: 'auto', // auto | color hexacode
			theme: 'dark', // dark | light
			blur: 5, // when bg is image [modern browsers]
			bgOpacity: 0.9,
			frame: true,
			duration: 400,
			height: 'fit', // fit | fullscreen
			nextPrevLinks: true, // true | false
			keyboard: true, // true | false
			callbacks: {
				beforeShow: 	function(){},
				afterShow: 		function(){},
				beforeNext: 	function(){},
				afterNext: 		function(){},
				beforePrevious: function(){},
				afterPrevious: 	function(){},
				beforeClose: 	function(){},
				afterClose: 	function(){}
			}
		}, _options );

		this.initElements = function(){
			if ($("#lightmybox").length > 0) {
				wrapper = $("#lightmybox");
			}
			if(!wrapper || wrapper.length == 0){
				wrapper = $("<div id='lightmybox'><span class='lightmybox-close'></span><span class='lightmybox-next'></span><span class='lightmybox-prev'></span><ul class='lightmybox-images'></ul></div></div");
				$("body").append(wrapper);
			}

			wrapper.attr('class',this.uniqueClass).addClass('lightmybox-theme-'+this.options.theme);

			if($("style#"+this.uniqueClass).length == 0){
				var style = $("<style id='"+this.uniqueClass+"'></style>");

				var duration = this.options.duration / 1000 + 's';
				var opacityDuration = this.options.duration / 1000 * 1.2 + 's';
				var css = '';

				css += "#lightmybox."+this.uniqueClass+" ul.lightmybox-images li{ transition-duration: "+duration+"; } ";
				css += "#lightmybox."+this.uniqueClass+" ul.lightmybox-images .lightmybox-image{ transition: opacity ease "+opacityDuration+"; } ";

				style.html(css);
				style.appendTo($("head"));
			}

			if ($("#lightmybox-loading").length > 0) {
				loading = $("#lightmybox-loading");
			}
			if(!loading || loading.length == 0){
				loading = $("<div id='lightmybox-loading'></div>");
				$("body").append(loading);
			}

			var ul = wrapper.find('ul.lightmybox-images').html('').addClass('lightmybox-mode-'+this.options.mode);
			this.li.prev = this.li.next = this.li.current = false;
			var li_count = (this.options.mode == 'single')?1:3;
			for (var i = 0; i < li_count; i++) {
				var li = $("<li><div class='lightmybox-bg'></div><div class='lightmybox-image'><img /></div></li>");
				ul.append(li);
				if(this.options.mode == 'single'){
					this.li.current = li.addClass('lightmybox-item-current');
				}
				else{
					if(i == 0) this.li.prev = li.addClass('lightmybox-item-prev');
					if(i == 1) this.li.current = li.addClass('lightmybox-item-current');
					if(i == 2) this.li.next = li.addClass('lightmybox-item-next');
				}
			}
			lockBtns = false;
		};

		this.bindEvents = function(){
			wrapper.on('click','.lightmybox-bg',function(){ if(that.isOpen()) { that.close(); } });

			wrapper.on('click','.lightmybox-close',function(){ if(that.isOpen()) { that.close(); } });

			loading.on('click',function(){
				that.close();
			});

			wrapper.on('click','.lightmybox-next', function(){ if(that.isOpen()) { that.goNext(); } });
			wrapper.on('click','.lightmybox-prev', function(){ if(that.isOpen()) { that.goPrev(); } });

			wrapper.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend','ul.lightmybox-images li',function(e) {
				$(this).trigger('cssAnimated');
			});

			if(this.options.keyboard) {
				$(document).on('keydown.lightmybox', function(e){ if(that.isOpen()) { that.keyboardHandler(e); } })
			} else {
				$(document).off('keydown.lightmybox');
			}

			var resizeId = false;
			$(window).on('resize.lightmybox',function(){
				clearTimeout(resizeId);
				resizeId = setTimeout(function(){
					if(that.isOpen()) {
						that.setHeight();
						that.setHeight(that.prevLi(), that.prevImage());
						that.setHeight(that.nextLi(), that.nextImage());
					}
				}, 10);
			});
		};

		this.init = function(el){
			var index = el.data('lightmybox-index') / 1;
			activeIndex = index;
			var image = this.getImage(index);
			this.initElements();
			if(image.loaded)
				this.start();
			else
				$.when(this.loadImage(image, true)).done(function(){
					if (image.error == false ) {
						that.start();
					}
				});
		};

		this.initNextPrevs = function(){
			var nextImage 	= this.nextImage();
			var nextLi 		= this.nextLi();
			if (nextImage) {
				$.when(this.loadImage(nextImage, false, 1)).done(function(){
					that.beautify(nextLi,nextImage);
					that.setSrc(nextLi,nextImage);
				});
				wrapper.find('.lightmybox-next').show();
			} else {
				this.resetLi(nextLi);
				wrapper.find('.lightmybox-next').hide();
			}

			var prevImage 	= this.prevImage();
			var prevLi 		= this.prevLi();
			if (prevImage) {
				$.when(this.loadImage(prevImage, false, -1)).done(function(){
					that.beautify(prevLi,prevImage);
					that.setSrc(prevLi,prevImage);
				});
				if (this.options.nextPrevLinks) {
					wrapper.find('.lightmybox-prev').show();
				}
			} else {
				this.resetLi(prevLi);
				wrapper.find('.lightmybox-prev').hide();
			}
		};

		this.nextPrevLinks = function(){
			if(this.options.mode == 'slideshow' && this.options.nextPrevLinks)
			{
				wrapper.find('.lightmybox-next').show();
				wrapper.find('.lightmybox-prev').show();
			}
			else{
				wrapper.find('.lightmybox-next').hide();
				wrapper.find('.lightmybox-prev').hide();
			}
		};

		this.loadImage = function(image, showLoader, loadDirection){
			if(!image) return false;
			if(!loadDirection) loadDirection = 0;
			if(image.loaded) return true;
			if(image.loading && image.promise) return image.promise;

			if(showLoader) loading.show();
			image.loading = true;
			image.promise = new $.Deferred(
				function(dfd) {
					$('<img/>').load(function() {
						image.width  = $(this)[0].width;
						image.height = $(this)[0].height;
						image.loading = false;
						image.loaded = true;
						dfd.resolve();

						if(showLoader) loading.hide();
						if(loadDirection != 0) that.loadImage(that.getImage(image.index + loadDirection), false, loadDirection);
					}).error(function(){
						image.error = true;
						dfd.resolve();

						if(showLoader) loading.hide();
						if(loadDirection != 0) that.loadImage(that.getImage(image.index + loadDirection), false, loadDirection);
					}).attr('src' , image.src);
				}
			).promise();
			return image.promise;
		};

		this.animateWrapperIn = function(){
			$("body").addClass('lightmybox-open');
			return wrapper.fadeIn(this.options.duration);
		};

		this.resetLis = function(){
			this.li.prev = wrapper.find(".lightmybox-item-prev");
			this.li.current = wrapper.find(".lightmybox-item-current");
			this.li.next = wrapper.find(".lightmybox-item-next");
		};

		this.resetLi = function(li){
			li.find(".lightmybox-bg").html('').removeAttr('style').attr('class','lightmybox-bg');
			li.find(".lightmybox-image").removeAttr('style').attr('class','lightmybox-image');
		};

		this.beautify = function(li,image){
			li = li || this.activeLi();
			image = image || this.getImage();

			// reset elements
			this.resetLi(li);
			var bg_element = li.find(".lightmybox-bg");
			var img_element = li.find(".lightmybox-image");

			if(this.options.frame) img_element.addClass('lightmybox-has-frame');
			else img_element.removeClass('lightmybox-has-frame');

			// scroll to top
			li.scrollTop(0);

			// background
			this.setBackground(li,image);
			// ---------

			// height
			this.setHeight(li, image);
			// ------
		};

		this.setHeight = function(li,image){
			li = li || this.activeLi();
			image = image || this.getImage();

			var bg_element = li.find(".lightmybox-bg");
			var img_element = li.find(".lightmybox-image");

			img_element.removeAttr('style').children("img").removeAttr('style');
			if(this.options.height == 'fit'){
				var offset = CONST_OFFSET;
				offset += img_element.css('padding-top').replace('px','') / 1;
				offset += img_element.css('padding-bottom').replace('px','') / 1;

				var maxHeight 	= $(window).height() - offset;
				var maxWidth 	= $(window).width() * (parseFloat(img_element.css('max-width').replace('%','')) / 100);

				var ratio 	= image.width / image.height;
				var height 	= (maxHeight > image.height)?image.height:maxHeight;
				var width 	= (maxWidth > image.width)?image.width:maxWidth;
				var z 		= img_element.css('max-width').replace('%','');
				
				var tempHeight = width / ratio;
				if (tempHeight > height) {
					var tempWidth = height * ratio;
					width = tempWidth;
				} else {
					height = tempHeight;
				}

				var marginTop = ($(window).height() - height) / 2;
				img_element.css('margin-top',marginTop + 'px');

				li.find(".lightmybox-image img").css({
					'max-height': 	maxHeight,
					'width': 		width + 'px',
					'height': 		height + 'px'
				});
			}
			else if(this.options.height == 'fullscreen'){
				wrapper.addClass('lightmybox-fullscreen');
				var ratio = image.width / image.height;
				var width = $(window).width();
				var height = width / ratio;
				var diff = $(window).height() - height;
				if (diff > 0) {
					img_element.css('margin-top', (diff / 2) + 'px');
				}
			}
		};

		this.setBackground = function(li, image){
			li = li || this.activeLi();
			image = image || this.getImage();

			var bg_element = li.find(".lightmybox-bg");
			var img_element = li.find(".lightmybox-image");

			if(this.options.bg == 'color' || image.element.data('color')){
				var color = image.element.data('color');
				if(!color && this.options.color) color = this.options.color ;
				if(color == 'auto'){
					var palette = this.getPalette($("<img src='"+image.src+"' />")[0], 5);
					color		= {r: palette[0][0], g: palette[0][1], b: palette[0][2]};
				}
				else color = this.hexToRgb(color);

				bg_element.css({ backgroundColor: 'rgba('+color.r+','+color.g+','+color.b+','+this.options.bgOpacity+')' });
				bg_element.addClass('lightmybox-bg-color');
			}
			else{
				if(this.options.bg && this.options.bg.length > 0) bg_element.addClass('lightmybox-bg-'+this.options.bg);

				if(this.options.bg == 'pixelate'){
					var ctx = pixelate.apply($("<img src='"+image.src+"' />")[0]);
					var datauri = ctx.toDataURL(1);
					bg_element.css({backgroundImage: "url("+datauri+")"}).fadeTo(0,this.options.bgOpacity);
				}
				else
				if(this.options.bg == 'image'){
					bg_element.css({backgroundImage: "url("+image.src+")"}).fadeTo(0,this.options.bgOpacity);
					if(this.options.blur > -1) this.blur(bg_element, this.options.blur);
				}
			}
		};

		this.start = function(){
			var that = this;
			this.callback('beforeShow');
			this.beautify();
			that.setSrc();
			$.when(this.animateWrapperIn()).done(function(){
				that.callback('afterShow');
			});
			this.nextPrevLinks();
			if(this.options.mode == 'slideshow'){
				this.initNextPrevs();
			}
		};

		this.setSrc = function(li, image){
			li = li || this.activeLi();
			image = image || this.getImage();

			li.find(".lightmybox-image img").attr('src',image.src);
		};

		this.goNext = function(){
			var image = this.nextImage();
			if(!image || this.options.mode != 'slideshow' || lockBtns) return false;
			lockBtns = true;

			if(image.loaded){
				this.doGoNext();
			}
			else
			if(!image.loaded && image.loading && image.promise){
				loading.show();
				$.when(image.promise).done(function(){
					loading.hide();
					that.doGoNext();
				});
			}
			else{
				$.when(this.loadImage(image, false)).done(function(){
					that.beautify(that.nextLi(),image);
					that.setSrc(that.nextLi(),image);
					that.doGoNext();
				});
			}
		};

		this.doGoNext = function(){
			var image = this.nextImage();
			if(!image) return false;

			this.callback('beforeNext');

			var dff1 = new $.Deferred();
			this.activeLi().attr('class','lightmybox-item-prev').one('cssAnimated',function(){
				dff1.resolve();
			});

			var dff2 = new $.Deferred();
			this.nextLi().attr('class','lightmybox-item-current').one('cssAnimated',function(){
				dff2.resolve();
			});

			$.when(dff1.promise(), dff2.promise()).done(function(){
				that.prevLi().attr('class','no-transition lightmybox-item-next');
				setTimeout(function(){
					that.prevLi().removeClass('no-transition');
					that.resetLis();
					activeIndex = image.index;
					that.initNextPrevs();
					lockBtns = false;
					that.callback('afterNext');
				},1);
			});
		};

		this.goPrev = function(){
			var image = this.prevImage();
			if(!image || this.options.mode != 'slideshow' || lockBtns) return false;
			lockBtns = true;

			if(image.loaded){
				this.doGoPrev();
			}
			else
			if(!image.loaded && image.loading && image.promise){
				loading.show();
				$.when(image.promise).done(function(){
					loading.hide();
					that.doGoPrev();
				});
			}
			else{
				$.when(this.loadImage(image, false)).done(function(){
					that.beautify(that.prevLi(),image);
					that.setSrc(that.prevLi(),image);
					that.doGoPrev();
				});
			}
		};

		this.doGoPrev = function(){
			var image = this.prevImage();
			if(!image) return false;

			this.callback('beforePrevious');
			
			var dff1 = new $.Deferred();
			this.activeLi().attr('class','lightmybox-item-next').one('cssAnimated',function(){
				dff1.resolve();
			});

			var dff2 = new $.Deferred();
			this.prevLi().attr('class','lightmybox-item-current').one('cssAnimated',function(){
				dff2.resolve();
			});

			$.when(dff1.promise(), dff2.promise()).done(function(){
				that.nextLi().attr('class','no-transition lightmybox-item-prev');
				setTimeout(function(){
					that.nextLi().removeClass('no-transition');
					that.resetLis();
					activeIndex = image.index;
					that.initNextPrevs();
					lockBtns = false;
					that.callback('afterPrevious');
				},1);
			});
		};

		this.close = function(){
			this.callback('beforeClose');
			wrapper.fadeOut(this.options.duration, function(){
				that.callback('afterClose');
			});
			loading.fadeOut(this.options.duration);
			$("body").removeClass('lightmybox-open');
		};

		this.activeLi 	= function(){ return this.li['current']; };
		this.prevLi 	= function(){ return this.li['prev']; };
		this.nextLi 	= function(){ return this.li['next']; };

		this.addImage = function(el){
			var index = this.images.length;
			var img = {
				width: false,
				height: false,
				src: el.attr('href'),
				loading: false,
				loaded: false,
				promise: false,
				error: false,
				index: index,
				element: el
			};
			this.images.push(img);
			return index;
		};

		this.getImage = function(index){
			if(typeof index == 'undefined') index = activeIndex;
			return this.images[index] || false;
		};
		this.nextImage = function(image){
			var nextImage = false;
			if (image) 	nextImage = this.getImage(image.index + 1);
			else 		nextImage = this.getImage(activeIndex + 1);
			
			if (nextImage && nextImage.error) {
				return this.nextImage(nextImage);
			}
			return nextImage;
		};
		this.prevImage = function(image){
			var prevImage = false;
			if(image) 	prevImage = this.getImage(image.index - 1 );
			else 		prevImage = this.getImage(activeIndex - 1);

			if (prevImage && prevImage.error) {
				return this.prevImage(prevImage);
			}
			return prevImage;
		};

		this.callback = function(key) {
			if(typeof this.options.callbacks[key] == 'function') {
				this.options.callbacks[key].call();
			}
		};

		this.isOpen = function() {
			return wrapper.is(":visible") && wrapper.hasClass(this.uniqueClass);
		};

		this.keyboardHandler = function(e){
			var event = window.event ? window.event : e;
			switch(event.keyCode){
				case 39:
				case 32:
					this.goNext();
					break;
				case 37:
					this.goPrev();
					break;
				case 27:
					this.close();
					break;
			}
		}


		// utility functions
		this.blur = function(element, blur){
			element.css({
				"filter": "blur("+blur+"px)",
				"-webkit-filter": "blur("+blur+"px)"
			})
		};

		this.hexToRgb = function(hex) {
			var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
				hex = hex.replace(shorthandRegex, function(m, r, g, b) {
				return r + r + g + g + b + b;
			});

			var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			return result ? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			} : null;
		};

		this.getPalette = function(sourceImage, colorCount, quality) {

			if (typeof colorCount === 'undefined') colorCount = 10;
			if (typeof quality === 'undefined' || quality < 1) quality = 10;

			// Create custom CanvasImage object
			var image      = new CanvasImage(sourceImage);
			var imageData  = image.context.getImageData(0, 0, image.width, image.height);
			var pixels     = imageData.data;
			var pixelCount = image.width * image.height;

			var pixelArray = [];
			for (var i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
				offset = i * 4;
				r = pixels[offset + 0];
				g = pixels[offset + 1];
				b = pixels[offset + 2];
				a = pixels[offset + 3];
				// If pixel is mostly opaque and not white
				if (a >= 125) {
					if (!(r > 250 && g > 250 && b > 250)) {
						pixelArray.push([r, g, b]);
					}
				}
			}

			var cmap    = MMCQ.quantize(pixelArray, colorCount);
			var palette = cmap? cmap.palette() : null;

			// Clean up
			image.canvas.parentNode.removeChild(image.canvas);

			return palette;
		};
		
		var CanvasImage = function (image) {
			this.canvas  = document.createElement('canvas');
			this.context = this.canvas.getContext('2d');

			document.body.appendChild(this.canvas);

			this.width  = this.canvas.width  = image.width;
			this.height = this.canvas.height = image.height;

			this.context.drawImage(image, 0, 0, this.width, this.height);
		};


		var MMCQ = (function() {
			// private constants
			var sigbits = 5,
				rshift = 8 - sigbits,
				maxIterations = 1000,
				fractByPopulations = 0.75;

			// get reduced-space color index for a pixel
			function getColorIndex(r, g, b) {
				return (r << (2 * sigbits)) + (g << sigbits) + b;
			}

			// Simple priority queue
			function PQueue(comparator) {
				var contents = [],
					sorted = false;

				function sort() {
					contents.sort(comparator);
					sorted = true;
				}

				return {
					push: function(o) {
						contents.push(o);
						sorted = false;
					},
					peek: function(index) {
						if (!sorted) sort();
						if (index===undefined) index = contents.length - 1;
						return contents[index];
					},
					pop: function() {
						if (!sorted) sort();
						return contents.pop();
					},
					size: function() {
						return contents.length;
					},
					map: function(f) {
						return contents.map(f);
					},
					debug: function() {
						if (!sorted) sort();
						return contents;
					}
				};
			}

			// 3d color space box
			function VBox(r1, r2, g1, g2, b1, b2, histo) {
				var vbox = this;
				vbox.r1 = r1;
				vbox.r2 = r2;
				vbox.g1 = g1;
				vbox.g2 = g2;
				vbox.b1 = b1;
				vbox.b2 = b2;
				vbox.histo = histo;
			}
			VBox.prototype = {
				volume: function(force) {
					var vbox = this;
					if (!vbox._volume || force) {
						vbox._volume = ((vbox.r2 - vbox.r1 + 1) * (vbox.g2 - vbox.g1 + 1) * (vbox.b2 - vbox.b1 + 1));
					}
					return vbox._volume;
				},
				count: function(force) {
					var vbox = this,
						histo = vbox.histo,
						index;
					if (!vbox._count_set || force) {
						var npix = 0,
							i, j, k;
						for (i = vbox.r1; i <= vbox.r2; i++) {
							for (j = vbox.g1; j <= vbox.g2; j++) {
								for (k = vbox.b1; k <= vbox.b2; k++) {
									 index = getColorIndex(i,j,k);
									 npix += (histo[index] || 0);
								}
							}
						}
						vbox._count = npix;
						vbox._count_set = true;
					}
					return vbox._count;
				},
				copy: function() {
					var vbox = this;
					return new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, vbox.histo);
				},
				avg: function(force) {
					var vbox = this,
						histo = vbox.histo;
					if (!vbox._avg || force) {
						var ntot = 0,
							mult = 1 << (8 - sigbits),
							rsum = 0,
							gsum = 0,
							bsum = 0,
							hval,
							i, j, k, histoindex;
						for (i = vbox.r1; i <= vbox.r2; i++) {
							for (j = vbox.g1; j <= vbox.g2; j++) {
								for (k = vbox.b1; k <= vbox.b2; k++) {
									 histoindex = getColorIndex(i,j,k);
									 hval = histo[histoindex] || 0;
									 ntot += hval;
									 rsum += (hval * (i + 0.5) * mult);
									 gsum += (hval * (j + 0.5) * mult);
									 bsum += (hval * (k + 0.5) * mult);
								}
							}
						}
						if (ntot) {
							vbox._avg = [~~(rsum/ntot), ~~(gsum/ntot), ~~(bsum/ntot)];
						} else {
							//console.log('empty box');
							vbox._avg = [
								~~(mult * (vbox.r1 + vbox.r2 + 1) / 2),
								~~(mult * (vbox.g1 + vbox.g2 + 1) / 2),
								~~(mult * (vbox.b1 + vbox.b2 + 1) / 2)
							];
						}
					}
					return vbox._avg;
				},
				contains: function(pixel) {
					var vbox = this,
						rval = pixel[0] >> rshift;
						gval = pixel[1] >> rshift;
						bval = pixel[2] >> rshift;
					return (rval >= vbox.r1 && rval <= vbox.r2 &&
							gval >= vbox.g1 && gval <= vbox.g2 &&
							bval >= vbox.b1 && bval <= vbox.b2);
				}
			};

			// Color map
			function CMap() {
				this.vboxes = new PQueue(function(a,b) {
					return pv.naturalOrder(
						a.vbox.count()*a.vbox.volume(),
						b.vbox.count()*b.vbox.volume()
					);
				});
			}
			CMap.prototype = {
				push: function(vbox) {
					this.vboxes.push({
						vbox: vbox,
						color: vbox.avg()
					});
				},
				palette: function() {
					return this.vboxes.map(function(vb) { return vb.color; });
				},
				size: function() {
					return this.vboxes.size();
				},
				map: function(color) {
					var vboxes = this.vboxes;
					for (var i=0; i<vboxes.size(); i++) {
						if (vboxes.peek(i).vbox.contains(color)) {
							return vboxes.peek(i).color;
						}
					}
					return this.nearest(color);
				},
				nearest: function(color) {
					var vboxes = this.vboxes,
						d1, d2, pColor;
					for (var i=0; i<vboxes.size(); i++) {
						d2 = Math.sqrt(
							Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
							Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
							Math.pow(color[2] - vboxes.peek(i).color[2], 2)
						);
						if (d2 < d1 || d1 === undefined) {
							d1 = d2;
							pColor = vboxes.peek(i).color;
						}
					}
					return pColor;
				},
				forcebw: function() {
					// XXX: won't  work yet
					var vboxes = this.vboxes;
					vboxes.sort(function(a,b) { return pv.naturalOrder(pv.sum(a.color), pv.sum(b.color));});

					// force darkest color to black if everything < 5
					var lowest = vboxes[0].color;
					if (lowest[0] < 5 && lowest[1] < 5 && lowest[2] < 5)
						vboxes[0].color = [0,0,0];

					// force lightest color to white if everything > 251
					var idx = vboxes.length-1,
						highest = vboxes[idx].color;
					if (highest[0] > 251 && highest[1] > 251 && highest[2] > 251)
						vboxes[idx].color = [255,255,255];
				}
			};

			// histo (1-d array, giving the number of pixels in
			// each quantized region of color space), or null on error
			function getHisto(pixels) {
				var histosize = 1 << (3 * sigbits),
					histo = new Array(histosize),
					index, rval, gval, bval;
				pixels.forEach(function(pixel) {
					rval = pixel[0] >> rshift;
					gval = pixel[1] >> rshift;
					bval = pixel[2] >> rshift;
					index = getColorIndex(rval, gval, bval);
					histo[index] = (histo[index] || 0) + 1;
				});
				return histo;
			}

			function vboxFromPixels(pixels, histo) {
				var rmin=1000000, rmax=0,
					gmin=1000000, gmax=0,
					bmin=1000000, bmax=0,
					rval, gval, bval;
				// find min/max
				pixels.forEach(function(pixel) {
					rval = pixel[0] >> rshift;
					gval = pixel[1] >> rshift;
					bval = pixel[2] >> rshift;
					if (rval < rmin) rmin = rval;
					else if (rval > rmax) rmax = rval;
					if (gval < gmin) gmin = gval;
					else if (gval > gmax) gmax = gval;
					if (bval < bmin) bmin = bval;
					else if (bval > bmax)  bmax = bval;
				});
				return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
			}

			function medianCutApply(histo, vbox) {
				if (!vbox.count()) return;

				var rw = vbox.r2 - vbox.r1 + 1,
					gw = vbox.g2 - vbox.g1 + 1,
					bw = vbox.b2 - vbox.b1 + 1,
					maxw = pv.max([rw, gw, bw]);
				// only one pixel, no split
				if (vbox.count() == 1) {
					return [vbox.copy()];
				}
				/* Find the partial sum arrays along the selected axis. */
				var total = 0,
					partialsum = [],
					lookaheadsum = [],
					i, j, k, sum, index;
				if (maxw == rw) {
					for (i = vbox.r1; i <= vbox.r2; i++) {
						sum = 0;
						for (j = vbox.g1; j <= vbox.g2; j++) {
							for (k = vbox.b1; k <= vbox.b2; k++) {
								index = getColorIndex(i,j,k);
								sum += (histo[index] || 0);
							}
						}
						total += sum;
						partialsum[i] = total;
					}
				}
				else if (maxw == gw) {
					for (i = vbox.g1; i <= vbox.g2; i++) {
						sum = 0;
						for (j = vbox.r1; j <= vbox.r2; j++) {
							for (k = vbox.b1; k <= vbox.b2; k++) {
								index = getColorIndex(j,i,k);
								sum += (histo[index] || 0);
							}
						}
						total += sum;
						partialsum[i] = total;
					}
				}
				else {  /* maxw == bw */
					for (i = vbox.b1; i <= vbox.b2; i++) {
						sum = 0;
						for (j = vbox.r1; j <= vbox.r2; j++) {
							for (k = vbox.g1; k <= vbox.g2; k++) {
								index = getColorIndex(j,k,i);
								sum += (histo[index] || 0);
							}
						}
						total += sum;
						partialsum[i] = total;
					}
				}
				partialsum.forEach(function(d,i) {
					lookaheadsum[i] = total-d;
				});
				function doCut(color) {
					var dim1 = color + '1',
						dim2 = color + '2',
						left, right, vbox1, vbox2, d2, count2=0;
					for (i = vbox[dim1]; i <= vbox[dim2]; i++) {
						if (partialsum[i] > total / 2) {
							vbox1 = vbox.copy();
							vbox2 = vbox.copy();
							left = i - vbox[dim1];
							right = vbox[dim2] - i;
							if (left <= right)
								d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
							else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
							// avoid 0-count boxes
							while (!partialsum[d2]) d2++;
							count2 = lookaheadsum[d2];
							while (!count2 && partialsum[d2-1]) count2 = lookaheadsum[--d2];
							// set dimensions
							vbox1[dim2] = d2;
							vbox2[dim1] = vbox1[dim2] + 1;
							//console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
							return [vbox1, vbox2];
						}
					}

				}
				// determine the cut planes
				return maxw == rw ? doCut('r') :
					maxw == gw ? doCut('g') :
					doCut('b');
			}

			function quantize(pixels, maxcolors) {
				// short-circuit
				if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
				// console.log('wrong number of maxcolors');
					return false;
				}

				// XXX: check color content and convert to grayscale if insufficient

				var histo = getHisto(pixels),
					histosize = 1 << (3 * sigbits);

				// check that we aren't below maxcolors already
				var nColors = 0;
				histo.forEach(function() { nColors++; });
				if (nColors <= maxcolors) {
					// XXX: generate the new colors from the histo and return
				}

				// get the beginning vbox from the colors
				var vbox = vboxFromPixels(pixels, histo),
					pq = new PQueue(function(a,b) { return pv.naturalOrder(a.count(), b.count()); });
				pq.push(vbox);

				// inner function to do the iteration
				function iter(lh, target) {
					var ncolors = 1,
						niters = 0,
						vbox;
					while (niters < maxIterations) {
						vbox = lh.pop();
						if (!vbox.count())  { /* just put it back */
							lh.push(vbox);
							niters++;
							continue;
						}
						// do the cut
						var vboxes = medianCutApply(histo, vbox),
							vbox1 = vboxes[0],
							vbox2 = vboxes[1];

						if (!vbox1) {
							//console.log("vbox1 not defined; shouldn't happen!");
							return;
						}
						lh.push(vbox1);
						if (vbox2) {  /* vbox2 can be null */
							lh.push(vbox2);
							ncolors++;
						}
						if (ncolors >= target) return;
						if (niters++ > maxIterations) {
							//console.log("infinite loop; perhaps too few pixels!");
							return;
						}
					}
				}

				// first set of colors, sorted by population
				iter(pq, fractByPopulations * maxcolors);

				// Re-sort by the product of pixel occupancy times the size in color space.
				var pq2 = new PQueue(function(a,b) {
					return pv.naturalOrder(a.count()*a.volume(), b.count()*b.volume());
				});
				while (pq.size()) {
					pq2.push(pq.pop());
				}

				// next set - generate the median cuts using the (npix * vol) sorting.
				iter(pq2, maxcolors - pq2.size());

				// calculate the actual colors
				var cmap = new CMap();
				while (pq2.size()) {
					cmap.push(pq2.pop());
				}

				return cmap;
			}

			return {
				quantize: quantize
			};
		})();

		var pv = {
			map: function(array, f) {
			  var o = {};
			  return f ? array.map(function(d, i) { o.index = i; return f.call(o, d); }) : array.slice();
			},
			naturalOrder: function(a, b) {
				return (a < b) ? -1 : ((a > b) ? 1 : 0);
			},
			sum: function(array, f) {
			  var o = {};
			  return array.reduce(f ? function(p, d, i) { o.index = i; return p + f.call(o, d); } : function(p, d) { return p + d; }, 0);
			},
			max: function(array, f) {
			  return Math.max.apply(null, f ? pv.map(array, f) : array);
			}
		};

		var pixelate = function() {
			var options = {
				value: 0.05
			};
			var maxWidth = 500;
			var element = this, //arguments[0],
				elementParent = element.parentNode;
			var display = element.style.display,
				imgWidth = element.width,
				imgHeight = element.height,
				revealed = false;
			var canv = document.createElement('canvas');
			canv.width = imgWidth * 0.8;
			canv.height = imgHeight * 0.8;
			var ctx = canv.getContext('2d');
			ctx.mozImageSmoothingEnabled = false;
			ctx.webkitImageSmoothingEnabled = false;
			ctx.imageSmoothingEnabled = false;
			var width = imgWidth * options.value,
				height = imgHeight * options.value;
			ctx.drawImage(element, 0, 0, width, height);
			ctx.drawImage(canv, 0, 0, width, height, 0, 0, canv.width, canv.height);
			return canv;
		};
		
		this.initElements();
		this.bindEvents();

		return this.each(function(i){
			if($(this).data('lightmybox-index') > -1) return true;
			var index = that.addImage($(this));
			$(this).data('lightmybox-index',index);
			$(this).on('click',function(e){
				e.preventDefault();
				that.init($(this));
			});
		});
	};

}( jQuery ));