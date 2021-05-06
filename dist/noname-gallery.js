; (function () {
	'use strict';
	var NonameGallery = function (options) {
		this.options = Object.assign({}, this.defaults, options);
		this.container = null;
		this.bg = null;
		this.wrap = null;
		this.counter = null;
		this.imgList = null;
		this.windowWidth = 0;
		this.windowHeight = 0;
		this.previewList = [];
		this.index = this.options.index;
		this.wrapWidth = 0;
		this.wrapTranslateX = 0;
		this.currentImg = {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			scale: 0,
			status: ''
		};
		this.bgOpacity = 1;
		this.start = { x: 0, y: 0 };
		this.start2 = { x: 0, y: 0 };
		this.step = { x: 0, y: 0 };
		this.distance = { x: 0, y: 0 };
		this.lastDistance = { x: 0, y: 0 };
		this.lastMove = { x: 0, y: 0 };
		this.lastCenter = null;
		this.lastDistanceRatio = 1;
		this.clickCount = 0;
		this.direction = '';
		this.dragTarget = '';
		this.isMousedown = false;
		this.singleClickTimer = null;
		this.startTime = null;
		this.lastMoveTime = null;
		this.rafId = null;
	}
	NonameGallery.prototype.defaults = {
		list: [],
		index: 0,
		fadeInOut: true,
		useTransition: true,
		verticalZoom: true,
		openKeyboard: true,
		zoomToScreenCenter: false,
		duration: 300,
		minScale: 1.5
	}
	NonameGallery.prototype.init = function () {
		if (this.options.list.length === 0) {
			throw new Error('options.list can not be empty array');
		}
		this.setWindowSize();
		this.setPreviewList();
		var item = this.previewList[this.index];
		this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		this.setWrap();
		this.render();
		this.setProperties();
		this.open();
		this.bindEventListener();
	}
	NonameGallery.prototype.setWindowSize = function () {
		this.windowWidth = window.innerWidth;
		this.windowHeight = window.innerHeight;
	}
	NonameGallery.prototype.setPreviewList = function () {
		this.previewList = [];
		for (var i = 0, length = this.options.list.length; i < length; i++) {
			var element = this.options.list[i];
			var rect = element.getBoundingClientRect();
			var result = this.getImgSize(element.naturalWidth, element.naturalHeight);
			var maxScale = this.decimal(element.naturalWidth / result.width, 5);
			if (maxScale < this.options.minScale) {
				maxScale = this.options.minScale;
			}
			this.previewList[i] = {};
			var item = this.previewList[i];
			item.x = Math.round((this.windowWidth - result.width) / 2);
			item.y = Math.round((this.windowHeight - result.height) / 2);
			item.width = Math.round(result.width);
			item.height = Math.round(result.height);
			item.maxWidth = Math.round(result.width * maxScale);
			item.maxHeight = Math.round(result.height * maxScale);
			item.maxScale = maxScale;
			item.thumbnail = {};
			item.thumbnail.x = Math.round(rect.left);
			item.thumbnail.y = Math.round(rect.top);
			item.thumbnail.width = Math.round(rect.width);
			item.thumbnail.height = Math.round(rect.height);
			item.thumbnail.scale = this.decimal(rect.width / result.width, 5);
		}
	}
	NonameGallery.prototype.setCurrentImg = function (x, y, width, height, scale, status) {
		this.currentImg = {
			x: x,
			y: y,
			width: width,
			height: height,
			scale: scale,
			status: status
		};
	}
	NonameGallery.prototype.setWrap = function () {
		this.wrapWidth = this.previewList.length * this.windowWidth;
		this.wrapTranslateX = this.index * this.windowWidth * -1;
	}
	NonameGallery.prototype.render = function () {
		var cssText = 'opacity: 0;';
		if (this.options.useTransition) {
			cssText += ' transition: opacity ' + this.options.duration + 'ms;'
		}
		var html = '<div class="noname-gallery-container">'
			+ '<div class="noname-gallery-bg" style="' + cssText + '"></div>'
			+ '<div class="noname-gallery-counter">' + (this.options.index + 1) + ' / ' + this.options.list.length + '</div>'
			+ '<ul class="noname-gallery-wrap" style="width: ' + this.wrapWidth
			+ 'px; transform: translate3d(' + this.wrapTranslateX + 'px, 0, 0)">';
		for (var i = 0, length = this.options.list.length; i < length; i++) {
			// 预览图片列表项
			var item = this.previewList[i];
			cssText = '';
			if (this.options.useTransition) {
				cssText = 'width: ' + item.width + 'px; height: ' + item.height + 'px;';
				if (this.index === i) {
					cssText += 'transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scale + ');';
					if (this.options.fadeInOut) {
						cssText += ' opacity: 0;';
					}
				} else {
					cssText += 'transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1);';
				}
				cssText += ' transition: transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms;';
			} else {
				if (this.index === i) {
					cssText = 'width: ' + item.thumbnail.width + 'px; height: ' + item.thumbnail.height + 'px;';
					cssText += ' transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0);';
					if (this.options.fadeInOut) {
						cssText += ' opacity: 0;';
					}
				} else {
					cssText = 'width: ' + item.width + 'px; height: ' + item.height + 'px;';
					cssText += ' transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0);';
				}
			}
			cssText += ' cursor: zoom-in;';
			html += '<li>'
				+ '<img class="noname-gallery-img" src="' + this.options.list[i].src + '" alt="" style="' + cssText + '">'
				+ '</li>';
		}
		html += '</ul></div>';
		document.body.insertAdjacentHTML('beforeend', html);
	}
	NonameGallery.prototype.setProperties = function () {
		this.container = document.querySelector('.noname-gallery-container');
		this.wrap = document.querySelector('.noname-gallery-wrap');
		this.bg = document.querySelector('.noname-gallery-bg');
		this.counter = document.querySelector('.noname-gallery-counter');
		this.imgList = document.querySelectorAll('.noname-gallery-img');
		for (var i = 0, length = this.imgList.length; i < length; i++) {
			this.previewList[i].element = this.imgList[i];
		}
	}
	NonameGallery.prototype.open = function () {
		var item = this.previewList[this.index];
		if (this.options.useTransition) {
			window.getComputedStyle(item.element).opacity;
			this.bg.style.opacity = '1';
			if (this.options.fadeInOut) {
				item.element.style.opacity = '1';
			}
			item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
		} else {
			var obj = {
				bg: {
					opacity: { from: 0, to: 1 }
				},
				img: {
					width: { from: item.thumbnail.width, to: item.width },
					height: { from: item.thumbnail.height, to: item.height },
					x: { from: item.thumbnail.x, to: item.x },
					y: { from: item.thumbnail.y, to: item.y }
				},
				type: 'bgAndImg',
				index: this.index
			}
			if (this.options.fadeInOut) {
				obj.img.opacity = { from: 0, to: 1 };
			}
			this.raf(obj);
		}
	}
	NonameGallery.prototype.close = function () {
		var item = this.previewList[this.index];
		if (this.options.useTransition) {
			if (this.options.fadeInOut) {
				item.element.style.opacity = '0';
			}
			item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
			item.element.style.transform = 'translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scale + ')';
			this.bg.style.opacity = '0';
		} else {
			var obj = {
				bg: {
					opacity: { from: this.bgOpacity, to: 0 }
				},
				img: {
					width: { from: this.currentImg.width, to: item.thumbnail.width },
					height: { from: this.currentImg.height, to: item.thumbnail.height },
					x: { from: this.currentImg.x, to: item.thumbnail.x },
					y: { from: this.currentImg.y, to: item.thumbnail.y },
				},
				type: 'bgAndImg',
				index: this.index
			}
			if (this.options.fadeInOut) {
				obj.img.opacity = { from: 1, to: 0 };
			}
			this.raf(obj);
		}
		this.unbindEventListener();
		setTimeout(() => {
			this.container.remove();
		}, this.options.duration);
	}
	NonameGallery.prototype.bindEventListener = function () {
		this.handleMousedown = this.handleMousedown.bind(this);
		this.handleMousemove = this.handleMousemove.bind(this);
		this.handleMouseup = this.handleMouseup.bind(this);
		this.handleTouchstart = this.handleTouchstart.bind(this);
		this.handleTouchmove = this.handleTouchmove.bind(this);
		this.handleTouchend = this.handleTouchend.bind(this);
		this.handleTouchcancel = this.handleTouchcancel.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.handleKeydown = this.handleKeydown.bind(this);

		window.addEventListener('mousedown', this.handleMousedown);
		window.addEventListener('mousemove', this.handleMousemove);
		window.addEventListener('mouseup', this.handleMouseup);
		this.container.addEventListener('touchstart', this.handleTouchstart);
		this.container.addEventListener('touchmove', this.handleTouchmove);
		this.container.addEventListener('touchend', this.handleTouchend);
		this.container.addEventListener('touchcancel', this.handleTouchcancel);
		window.addEventListener('resize', this.handleResize);
		window.addEventListener('orientationchange', this.handleResize);
		window.addEventListener('keydown', this.handleKeydown);
	}
	NonameGallery.prototype.unbindEventListener = function () {
		window.removeEventListener('mousedown', this.handleMousedown);
		window.removeEventListener('mousemove', this.handleMousemove);
		window.removeEventListener('mouseup', this.handleMouseup);
		this.container.removeEventListener('touchstart', this.handleTouchstart);
		this.container.removeEventListener('touchmove', this.handleTouchmove);
		this.container.removeEventListener('touchend', this.handleTouchend);
		this.container.removeEventListener('touchcancel', this.handleTouchcancel);
		window.removeEventListener('resize', this.handleResize);
		window.removeEventListener('orientationchange', this.handleResize);
		window.removeEventListener('keydown', this.handleKeydown);
	}
	NonameGallery.prototype.handleMousedown = function (e) {
		if (e.button === 0) {
			this.isMousedown = true;
			this.start = { x: e.clientX, y: e.clientY };
			this.lastMove = { x: e.clientX, y: e.clientY };
			this.distance = { x: 0, y: 0 };
			this.lastDistance = { x: 0, y: 0 };
			this.clickCount = 1;
			this.direction = '';
			this.dragTarget = '';
		}
	}
	NonameGallery.prototype.handleMousemove = function (e) {
		if (this.isMousedown) {
			this.handleMove(e);
		}
		e.preventDefault();
	}
	NonameGallery.prototype.handleMouseup = function (e) {
		if (e.button === 0) {
			this.isMousedown = false;
			window.cancelAnimationFrame(this.radId);
			if (this.dragTarget === 'wrap') {
				this.handleWrapMoveEnd();
			} else if (this.dragTarget === 'img') {
				this.handleImgMoveEnd();
			}
			if (this.clickCount !== 0) {
				if (e.target.className === 'noname-gallery-img') {
					this.handleZoom({ x: e.clientX, y: e.clientY });
				} else {
					this.close();
				}
			}
		}
	}
	NonameGallery.prototype.handleTouchstart = function (e) {
		this.start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		this.lastMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		window.cancelAnimationFrame(this.rafId);
		if (e.touches.length === 1) {
			this.distance = { x: 0, y: 0 };
			this.lastDistance = { x: 0, y: 0 };
			this.direction = '';
			this.dragTarget = '';
			this.startTime = Date.now();
			clearTimeout(this.singleClickTimer);
			this.clickCount++;
		} else if (e.touches.length === 2) {
			this.start2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
			this.clickCount = 0;
			this.lastDistanceRatio = 1;
			this.lastCenter = null;
		}
		e.preventDefault();
	}
	NonameGallery.prototype.handleTouchmove = function (e) {
		if (e.touches.length === 1) {
			if (this.currentImg.status !== 'shrink') {
				this.handleMove(e);
			}
		} else if (e.touches.length === 2) {
			if (this.dragTarget !== 'wrap' && this.currentImg.status !== 'verticalToClose') {
				if (this.dragTarget === '') this.dragTarget = 'img';
				this.handlePinch(e);
			}
		}
		e.preventDefault();
	}
	NonameGallery.prototype.handleTouchend = function (e) {
		if (e.touches.length === 0) {
			if (this.dragTarget === 'wrap') {
				this.handleWrapMoveEnd();
			} else if (this.dragTarget === 'img') {
				this.handleImgMoveEnd();
			}
			var now = Date.now();
			if (this.clickCount > 1) {
				this.clickCount = 0;
				this.handleZoom(this.start);
			} else if (now - this.startTime < 300) {
				if (this.clickCount === 1) {
					this.singleClickTimer = setTimeout(() => {
						this.clickCount = 0;
						this.close();
					}, 300);
				}
			} else {
				this.clickCount = 0;
			}
		} else if (e.touches.length === 1) {
			this.start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			this.lastMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			this.lastDistance = { x: this.distance.x, y: this.distance.y };
		}
	}
	NonameGallery.prototype.handleTouchcancel = function () {
		this.clickCount = 0;
	}
	NonameGallery.prototype.handleResize = function () {
		this.setWindowSize();
		this.setPreviewList();
		var item = this.previewList[this.index];
		this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		this.setWrap();
		for (var i = 0, length = this.imgList.length; i < length; i++) {
			var item = this.previewList[i];
			item.element = this.imgList[i];
			item.element.style.width = item.width + 'px';
			item.element.style.height = item.height + 'px';
			if (this.options.useTransition) {
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
				item.element.style.transition = 'none';
			} else {
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0)';
			}
			item.element.style.cursor = 'zoom-in';
		}
		this.wrap.style.width = this.wrapWidth + 'px';
		this.wrap.style.transform = 'translate3d(' + this.wrapTranslateX + 'px, 0, 0)';
		if (this.options.useTransition) {
			this.wrap.style.transition = 'none';
		}
		this.clickCount = 0;
	}
	NonameGallery.prototype.handleKeydown = function (e) {
		if (this.options.openKeyboard) {
			if (e.keyCode === 27) {
				this.close();
			} else if ([37, 38].includes(e.keyCode)) {
				this.switch('prev');
			} else if ([39, 40].includes(e.keyCode)) {
				this.switch('next');
			}
		}
	}
	NonameGallery.prototype.handleZoom = function (point) {
		var item = this.previewList[this.index];
		if (this.currentImg.width > item.width || this.currentImg.height > item.height) {
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
			} else {
				var obj = {
					img: {
						width: { from: this.currentImg.width, to: item.width },
						height: { from: this.currentImg.height, to: item.height },
						x: { from: this.currentImg.x, to: item.x },
						y: { from: this.currentImg.y, to: item.y }
					},
					type: 'img',
					index: this.index
				}
				this.raf(obj);
			}
			item.element.style.cursor = 'zoom-in';
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		} else {
			var ix, iy, x, y;
			var halfWindowWidth = Math.round(this.windowWidth / 2);
			var halfWindowHeight = Math.round(this.windowHeight / 2);
			ix = Math.round((point.x - item.x) * item.maxScale);
			iy = Math.round((point.y - item.y) * item.maxScale);
			if (item.maxWidth > this.windowWidth) {
				if (this.options.zoomToScreenCenter) {
					x = halfWindowWidth - ix;
				} else {
					x = point.x - ix;
				}
				if (x > 0) {
					x = 0;
				} else if (x < this.windowWidth - item.maxWidth) {
					x = this.windowWidth - item.maxWidth;
				}
			} else {
				x = Math.round((this.windowWidth - item.maxWidth) / 2);
			}
			x = Math.round(x);
			if (item.maxHeight > this.windowHeight) {
				if (this.options.zoomToScreenCenter) {
					y = halfWindowHeight - iy;
				} else {
					y = point.y - iy;
				}
				if (y > 0) {
					y = 0;
				} else if (y < this.windowHeight - item.maxHeight) {
					y = this.windowHeight - item.maxHeight;
				}
			} else {
				y = Math.round((this.windowHeight - item.maxHeight) / 2);
			}
			y = Math.round(y);
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + x + 'px,' + y + 'px, 0) scale(' + item.maxScale + ')';
			} else {
				var obj = {
					img: {
						width: { from: item.width, to: item.maxWidth },
						height: { from: item.height, to: item.maxHeight },
						x: { from: item.x, to: x },
						y: { from: item.y, to: y }
					},
					type: 'img',
					index: this.index
				}
				this.raf(obj);
			}
			item.element.style.cursor = 'zoom-out';
			this.setCurrentImg(x, y, item.maxWidth, item.maxHeight, item.maxScale, '');
		}
	}
	NonameGallery.prototype.handleMove = function (e) {
		var x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
		var y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
		this.step = { x: x - this.lastMove.x, y: y - this.lastMove.y };
		this.distance.x = x - this.start.x + this.lastDistance.x;
		this.distance.y = y - this.start.y + this.lastDistance.y;
		this.lastMove = { x: x, y: y };
		this.lastMoveTime = Date.now();
		if (Math.abs(this.distance.x) > 10 || Math.abs(this.distance.y) > 10) {
			this.clickCount = 0;
			this.getDirection();
			this.getDragTarget();
			if (this.dragTarget === 'wrap') {
				this.handleWrapMove();
			} else if (this.dragTarget === 'img') {
				this.handleImgMove();
			}
		}
	}
	NonameGallery.prototype.handlePinch = function (e) {
		var MIN_SCALE = 0.7;
		var item = this.previewList[this.index];
		var touche = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		var touche2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
		var end = this.getDistance(touche, touche2);
		var start = this.getDistance(this.start, this.start2);
		var distanceRatio = end / start;
		var ratio = distanceRatio / this.lastDistanceRatio;

		this.currentImg.scale *= ratio;
		this.currentImg.width *= ratio;
		this.currentImg.height *= ratio;
		if (this.currentImg.scale > item.maxScale) {
			this.currentImg.scale = item.maxScale;
			ratio = 1;
		} else if (this.currentImg.scale < MIN_SCALE) {
			this.currentImg.scale = MIN_SCALE;
			ratio = 1;
		}
		if (this.currentImg.scale < 1) {
			this.currentImg.status = 'shrink';
		} else {
			this.currentImg.status = '';
		}
		if (this.currentImg.width > item.maxWidth) {
			this.currentImg.width = item.maxWidth;
		} else if (this.currentImg.width < item.width * MIN_SCALE) {
			this.currentImg.width = Math.round(item.width * MIN_SCALE);
		}
		if (this.currentImg.height > item.maxHeight) {
			this.currentImg.height = item.maxHeight;
		} else if (this.currentImg.height < item.height * MIN_SCALE) {
			this.currentImg.height = Math.round(item.height * MIN_SCALE);
		}
		this.lastDistanceRatio = distanceRatio;

		var center = this.getCenter(touche, touche2);
		this.currentImg.x = this.currentImg.x - (ratio - 1) * (center.x - this.currentImg.x);
		this.currentImg.y = this.currentImg.y - (ratio - 1) * (center.y - this.currentImg.y);
		if (this.lastCenter) {
			this.currentImg.x = this.currentImg.x + center.x - this.lastCenter.x;
			this.currentImg.y = this.currentImg.y + center.y - this.lastCenter.y;
		}
		this.lastCenter = center;
		this.handleBoundary();
		if (this.options.useTransition) {
			item.element.style.transition = 'none';
			item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0) scale(' + this.currentImg.scale + ')';
		} else {
			item.element.style.width = this.currentImg.width + 'px';
			item.element.style.height = this.currentImg.height + 'px';
			item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0)';
		}
	}
	NonameGallery.prototype.handleBoundary = function (item) {
		if (this.currentImg.width > this.windowWidth) {
			if (this.currentImg.x > 0) {
				this.currentImg.x = 0
			} else if (this.currentImg.x < this.windowWidth - this.currentImg.width) {
				this.currentImg.x = this.windowWidth - this.currentImg.width;
			}
		} else {
			this.currentImg.x = (this.windowWidth - this.currentImg.width) / 2;
		}
		if (this.currentImg.height > this.windowHeight) {
			if (this.currentImg.y > 0) {
				this.currentImg.y = 0
			} else if (this.currentImg.y < this.windowHeight - this.currentImg.height) {
				this.currentImg.y = this.windowHeight - this.currentImg.height;
			}
		} else {
			this.currentImg.y = (this.windowHeight - this.currentImg.height) / 2;
		}
	}
	NonameGallery.prototype.getImgSize = function (naturalWidth, naturalHeight) {
		var ratio = naturalWidth / naturalHeight;
		var windowRatio = this.windowWidth / this.windowHeight;
		var width, height;
		if (ratio >= windowRatio) {
			if (naturalWidth > this.windowWidth) {
				width = this.windowWidth;
				height = this.windowWidth / naturalWidth * naturalHeight;
			} else {
				width = naturalWidth;
				height = naturalHeight;
			}
		} else {
			if (naturalHeight > this.windowHeight) {
				width = this.windowHeight / naturalHeight * naturalWidth;
				height = this.windowHeight;
			} else {
				width = naturalWidth;
				height = naturalHeight;
			}
		}
		return { width: width, height: height }
	}
	NonameGallery.prototype.getDirection = function () {
		if (this.direction === '') {
			if (Math.abs(this.distance.x) > Math.abs(this.distance.y)) {
				this.direction = 'h';
			} else {
				this.direction = 'v';
			}
		}
	}
	NonameGallery.prototype.getDragTarget = function () {
		if (this.dragTarget === '') {
			var flag = false, flag2 = false;
			if (this.currentImg.width > this.windowWidth) {
				if (
					(this.step.x > 0 && this.currentImg.x === 0) ||
					(this.step.x < 0 && this.currentImg.x === this.windowWidth - this.currentImg.width)
				) {
					flag = true;
				}
			} else {
				if (this.currentImg.width >= this.previewList[this.index].width) {
					flag2 = true;
				}
			}
			if (this.direction === 'h' && (flag || flag2)) {
				this.dragTarget = 'wrap';
			} else {
				this.dragTarget = 'img';
			}
		}
	}
	NonameGallery.prototype.getDistance = function (start, stop) {
		var x = stop.x - start.x;
		var y = stop.y - start.y;
		return Math.hypot(x, y);
	}
	NonameGallery.prototype.handleWrapMove = function () {
		if ((this.step.x > 0 && this.wrapTranslateX > 0) ||
			(this.step.x < 0 && this.wrapTranslateX < (this.previewList.length - 1) * this.windowWidth * - 1)) {
			this.wrapTranslateX += this.step.x * 0.3;
		} else {
			this.wrapTranslateX += this.step.x;
			var LEFT_X = (this.index - 1) * this.windowWidth * -1;
			var RIGHT_X = (this.index + 1) * this.windowWidth * -1;
			if (this.wrapTranslateX > LEFT_X) {
				this.wrapTranslateX = LEFT_X;
			} else if (this.wrapTranslateX < RIGHT_X) {
				this.wrapTranslateX = RIGHT_X;
			}
		}
		if (this.options.useTransition) {
			this.wrap.style.transition = 'none';
		}
		this.wrap.style.transform = 'translate3d(' + this.wrapTranslateX + 'px, 0, 0)';
	}
	NonameGallery.prototype.handleImgMove = function () {
		var item = this.previewList[this.index];
		if (this.currentImg.width > this.windowWidth || this.currentImg.height > this.windowHeight) {
			this.currentImg.x += this.step.x;
			this.currentImg.y += this.step.y;
			this.handleBoundary();
			this.currentImg.status = 'inertia';
			if (this.options.useTransition) {
				item.element.style.transition = 'none';
				item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0) scale(' + this.currentImg.scale + ')';
			} else {
				item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0)';
			}
		} else {
			if (this.direction === 'v' && this.currentImg.width <= item.width && this.currentImg.height <= item.height) {
				this.currentImg.status = 'verticalToClose';
				this.bgOpacity = this.decimal(1 - Math.abs(this.distance.y) / (this.windowHeight / 1.2), 5);
				if (this.bgOpacity < 0) {
					this.bgOpacity = 0;
				}
				if (this.options.verticalZoom) {
					this.currentImg.scale = this.bgOpacity;
					this.currentImg.width = Math.round(item.width * this.currentImg.scale);
					this.currentImg.height = Math.round(item.height * this.currentImg.scale);
					this.currentImg.x = item.x + this.distance.x + (item.width - this.currentImg.width) / 2;
					this.currentImg.y = item.y + this.distance.y + (item.height - this.currentImg.height) / 2;
				} else {
					this.currentImg.x = item.x;
					this.currentImg.y = item.y + this.distance.y;
					this.currentImg.scale = 1;
				}
				this.bg.style.opacity = this.bgOpacity;
				if (this.options.useTransition) {
					this.bg.style.transition = 'none';
					item.element.style.transition = 'none';
					item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px , 0) scale(' + this.currentImg.scale + ')';
				} else {
					item.element.style.width = this.currentImg.width + 'px';
					item.element.style.height = this.currentImg.height + 'px';
					item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px , 0)';
				}
			}
		}
	}
	NonameGallery.prototype.handleWrapMoveEnd = function () {
		var MIN_SWIPE_DISTANCE = Math.round(this.windowWidth * 0.15);
		var lastIndex = this.index;
		var lastItem = this.previewList[lastIndex];
		if (Math.abs(this.distance.x) > MIN_SWIPE_DISTANCE) {
			if (this.distance.x > 0) {
				if (lastIndex > 0) {
					this.index--;
				}
			} else {
				if (lastIndex < this.previewList.length - 1) {
					this.index++;
				}
			}
			// 切换时，如果之前图片放大过，则恢复
			if (lastIndex !== this.index) {
				var item = this.previewList[this.index];
				if (this.currentImg.width > lastItem.width || this.currentImg.height > lastItem.height) {
					if (this.options.useTransition) {
						lastItem.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
						lastItem.element.style.transform = 'translate3d(' + lastItem.x + 'px, ' + lastItem.y + 'px, 0) scale(1)';
					} else {
						var obj = {
							img: {
								width: { from: this.currentImg.width, to: lastItem.width },
								height: { from: this.currentImg.height, to: lastItem.height },
								x: { from: this.currentImg.x, to: lastItem.x },
								y: { from: this.currentImg.y, to: lastItem.y }
							},
							type: 'img',
							index: lastIndex
						}
						this.raf(obj);
					}
					lastItem.element.style.cursor = 'zoom-in';
				}
				this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
			}
		}
		var x = this.windowWidth * this.index * -1;
		if (this.options.useTransition) {
			this.wrap.style.transition = 'transform ' + this.options.duration + 'ms';
			this.wrap.style.transform = 'translate3d(' + x + 'px, 0, 0)';
		} else {
			var obj = {
				wrap: {
					x: { from: this.wrapTranslateX, to: x }
				},
				type: 'wrap'
			}
			this.raf(obj);
		}
		this.wrapTranslateX = x;
		this.counter.innerHTML = (this.index + 1) + ' / ' + this.previewList.length;
	}
	NonameGallery.prototype.handleImgMoveEnd = function () {
		var MIN_CLOSE_DISTANCE = Math.round(this.windowHeight * 0.15);
		var item = this.previewList[this.index];
		if (this.currentImg.status === 'inertia' && Date.now() - this.lastMoveTime < 100) {
			this.handleInertia();
		} else if (this.currentImg.status === 'verticalToClose' && Math.abs(this.distance.y) >= MIN_CLOSE_DISTANCE) {
			this.close();
			this.bgOpacity = 1;
		} else if (this.currentImg.status === 'shrink' || (this.currentImg.status == 'verticalToClose' && Math.abs(this.distance.y) < MIN_CLOSE_DISTANCE)) {
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
				this.bg.style.opacity = '1';
			} else {
				var obj = {
					bg: {
						opacity: { from: this.bgOpacity, to: 1 }
					},
					img: {
						width: { from: this.currentImg.width, to: item.width },
						height: { from: this.currentImg.height, to: item.height },
						x: { from: this.currentImg.x, to: item.x },
						y: { from: this.currentImg.y, to: item.y }
					},
					type: 'bgAndImg',
					index: this.index
				}
				this.raf(obj);
			}
			this.bgOpacity = 1;
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		}
	}
	NonameGallery.prototype.handleInertia = function () {
		var item = this.previewList[this.index];
		var x = this.currentImg.x;
		var y = this.currentImg.y;
		this.currentImg.x += this.step.x * 18;
		this.currentImg.y += this.step.y * 18;
		this.handleBoundary();
		if (this.options.useTransition) {
			item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out';
			item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0) scale(' + this.currentImg.scale + ')';
		} else {
			var obj = {
				img: {
					opacity: { from: 1, to: 1 },
					width: { from: this.currentImg.width, to: this.currentImg.width },
					height: { from: this.currentImg.height, to: this.currentImg.height },
					x: { from: x, to: this.currentImg.x },
					y: { from: y, to: this.currentImg.y }
				},
				type: 'img',
				index: this.index,
				duration: 500
			}
			this.raf(obj);
		}
	}
	NonameGallery.prototype.switch = function (type) {
		var isChange = false;
		if (type === 'prev') {
			if (this.index > 0) {
				this.index--;
				isChange = true;
			}
		} else {
			if (this.index < this.previewList.length - 1) {
				this.index++;
				isChange = true;
			}
		}
		if (isChange) {
			var x = this.windowWidth * this.index * -1;
			if (this.options.useTransition) {
				this.wrap.style.transition = 'transform ' + this.options.duration + 'ms';
				this.wrap.style.transform = 'translate3d(' + x + 'px, 0, 0)';
			} else {
				var obj = {
					wrap: {
						x: {
							from: this.wrapTranslateX,
							to: x
						}
					},
					type: 'wrap'
				}
				this.raf(obj);
			}
			this.wrapTranslateX = x;
			this.counter.innerHTML = (this.index + 1) + ' / ' + this.previewList.length;
			var item = this.previewList[this.index];
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		}
	}
	NonameGallery.prototype.decimal = function (num, n) {
		var x = Math.pow(10, n);
		return Math.round(num * x) / x;
	}
	NonameGallery.prototype.getCenter = function (point, point2) {
		var x = (point.x + point2.x) / 2;
		var y = (point.y + point2.y) / 2;
		return { x: x, y: y }
	}
	NonameGallery.prototype.easeOut = function (from, to, time, duration) {
		var change = to - from;
		return -change * (time /= duration) * (time - 2) + from;
	}
	NonameGallery.prototype.raf = function (obj) {
		var self = this;
		var start;
		var count = 0;
		var duration = obj.duration || this.options.duration;
		function step(timestamp) {
			if (start === undefined) {
				start = timestamp;
			}
			var time = timestamp - start;
			if (time > duration) {
				time = duration;
				count++;
			}
			if (count < 2) {
				if (obj.type === 'bgAndImg') {
					self.bgAnimate(obj, time, duration);
					self.imgAnimate(obj, time, duration);
				} else if (obj.type === 'wrap') {
					self.wrapAnimate(obj, time, duration);
				} else if (obj.type === 'img') {
					self.imgAnimate(obj, time, duration);
				}
				self.rafId = window.requestAnimationFrame(step);
			}
		}
		this.rafId = window.requestAnimationFrame(step);
	}
	NonameGallery.prototype.bgAnimate = function (obj, time, duration) {
		var opacity = this.easeOut(obj.bg.opacity.from, obj.bg.opacity.to, time, duration);
		this.bg.style.opacity = opacity;
	}
	NonameGallery.prototype.imgAnimate = function (obj, time, duration) {
		var item = this.previewList[obj.index];
		var width = this.easeOut(obj.img.width.from, obj.img.width.to, time, duration);
		var height = this.easeOut(obj.img.height.from, obj.img.height.to, time, duration);
		var x = this.easeOut(obj.img.x.from, obj.img.x.to, time, duration);
		var y = this.easeOut(obj.img.y.from, obj.img.y.to, time, duration);
		if (obj.img.opacity) {
			var opacity = this.easeOut(obj.img.opacity.from, obj.img.opacity.to, time, duration);
			item.element.style.opacity = opacity;
		}
		item.element.style.width = width + 'px';
		item.element.style.height = height + 'px';
		item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
	}
	NonameGallery.prototype.wrapAnimate = function (obj, time, duration) {
		var x = this.easeOut(obj.wrap.x.from, obj.wrap.x.to, time, duration);
		this.wrap.style.transform = 'translate3d(' + x + 'px, 0, 0)';
	}

	if (typeof define === 'function' && define.amd) {
		define(function () { return NonameGallery; });
	} else if (typeof module === 'object' && typeof exports === 'object') {
		module.exports = NonameGallery;
	} else {
		window.NonameGallery = NonameGallery;
	}
})();