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
		this.scale = 1;
		this.translate = { x: 0, y: 0 };
		this.start = { x: 0, y: 0 };
		this.start2 = { x: 0, y: 0 };
		this.step = { x: 0, y: 0 };
		this.stepSum = { x: 0, y: 0 };
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
		this.lastTwoFingersTime = null;
	}
	NonameGallery.prototype.defaults = {
		list: [],
		index: 0,
		showOpacity: true,
		zoomToScreenCenter: false,
		verticalZoom: false,
		escToClose: true,
		minScale: 1.5,
		duration: 300,
		animation: 'transition', // todo
	}
	NonameGallery.prototype.init = function () {
		if (this.options.list.length === 0) {
			throw new Error('options.list can not be empty array');
		}
		this.setWindowSize();
		this.setPreviewList();
		this.render();
		this.setProperties();
		this.open();
		this.bindEventListener();
	}
	NonameGallery.prototype.setWindowSize = function () {
		this.windowWidth = window.innerWidth;
		this.windowHeight = window.innerHeight;
	}
	NonameGallery.prototype.setTranslateScale = function (x, y, scale) {
		this.translate = { x: x, y: y };
		this.scale = scale;
	}
	NonameGallery.prototype.getImgSize = function (naturalWidth, naturalHeight) {
		var ratio = naturalWidth / naturalHeight;
		var windowRatio = this.windowWidth / this.windowHeight;
		var width, height;
		// 如果图片实际宽高比例 >= 屏幕宽高比例
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
	NonameGallery.prototype.decimal = function (num, n) {
		var x = Math.pow(10, n);
		return Math.round(num * x) / x;
	}
	NonameGallery.prototype.setPreviewList = function () {
		this.previewList = [];
		for (var i = 0, length = this.options.list.length; i < length; i++) {
			var img = this.options.list[i];
			// 缩略图的getBoundingClientRect信息
			var rect = img.getBoundingClientRect();
			// 计算预览图片显示宽高
			var result = this.getImgSize(img.naturalWidth, img.naturalHeight);
			var maxScale = this.decimal(img.naturalWidth / result.width, 3);
			if (maxScale < this.options.minScale) {
				maxScale = this.options.minScale;
			}
			this.previewList[i] = {};
			this.previewList[i].x = Math.round((this.windowWidth - result.width) / 2);
			this.previewList[i].y = Math.round((this.windowHeight - result.height) / 2);
			this.previewList[i].width = Math.round(result.width);
			this.previewList[i].height = Math.round(result.height);
			this.previewList[i].maxWidth = Math.round(result.width * maxScale);
			this.previewList[i].maxHeight = Math.round(result.height * maxScale);
			this.previewList[i].maxScale = maxScale;
			this.previewList[i].thumbnail = {};
			this.previewList[i].thumbnail.x = Math.round(rect.left);
			this.previewList[i].thumbnail.y = Math.round(rect.top);
			this.previewList[i].thumbnail.width = Math.round(rect.width);
			this.previewList[i].thumbnail.height = Math.round(rect.height);
			this.previewList[i].thumbnail.scale = this.decimal(rect.width / result.width, 3);
		}
		this.index = this.options.index;
		var item = this.previewList[this.index];
		this.setTranslateScale(item.x, item.y, 1);
		// wrap
		this.wrapWidth = this.previewList.length * this.windowWidth;
		this.wrapTranslateX = this.index * this.windowWidth * -1;
	}
	NonameGallery.prototype.render = function () {
		var html = '<div class="noname-gallery-container">'
			+ '<div class="noname-gallery-bg" style="transition: opacity ' + this.options.duration + 'ms;"></div>'
			+ '<div class="noname-gallery-counter">' + (this.index + 1) + ' / ' + this.previewList.length + '</div>'
			+ '<ul class="noname-gallery-wrap" style="width: ' + this.wrapWidth
			+ 'px; transform: translate3d(' + this.wrapTranslateX + 'px, 0, 0)">';

		for (var i = 0, length = this.options.list.length; i < length; i++) {
			// 预览图片列表项
			var item = this.previewList[i];

			var cssText = 'width: ' + item.width + 'px;';
			cssText += 'height: ' + item.height + 'px;';
			if (this.index === i) {
				cssText += 'transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scale + ');';
			} else {
				cssText += 'transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1);';
			}
			cssText += 'transition: transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms;';

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
		// 当前预览图片
		var item = this.previewList[this.index];
		// 如果开启淡入淡出
		if (this.options.showOpacity) {
			item.element.style.opacity = '0';
		}
		// 强制重绘，否则合并计算样式，导致无法触发过渡效果，或使用setTimeout，个人猜测最短时长等于，1000 / 60 = 16.66666 ≈ 17
		window.getComputedStyle(item.element).opacity;

		this.bg.style.opacity = '1';
		item.element.style.opacity = '1';
		item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
	}
	NonameGallery.prototype.close = function () {
		var item = this.previewList[this.index];
		item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
		item.element.style.transform = 'translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scale + ')';
		if (this.options.showOpacity) {
			item.element.style.opacity = '0';
		}
		this.bg.style.opacity = '0';
		// 移除事件
		this.unbindEventListener();

		setTimeout(() => {
			// 移除dom
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
		// e.button 0 = 左键 1 = 滚轮 2 = 右键
		if (e.button === 0) {
			this.start = { x: e.clientX, y: e.clientY };
			this.lastMove = { x: e.clientX, y: e.clientY };
			this.stepSum = { x: 0, y: 0 };
			this.clickCount = 1;
			this.isMousedown = true;
			this.startTime = Date.now();
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
			if (this.dragTarget === 'wrap') {
				this.handleWrapMoveEnd();
			} else {
				this.handleImgMoveEnd();
			}
			var now = Date.now();
			if (this.clickCount === 1 && now - this.startTime < 300) {
				if (e.target.className === 'noname-gallery-img') {
					this.handleZoom({ x: e.clientX, y: e.clientY });
				} else {
					this.close();
				}
			}
			if (now - this.lastMoveTime < 100) {
				this.handleInertial();
			}
		}
		e.preventDefault();
	}
	NonameGallery.prototype.handleTouchstart = function (e) {
		this.start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		this.lastMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		if (e.touches.length === 1) {
			this.stepSum = { x: 0, y: 0 };
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
		// 一根手指
		if (e.touches.length === 1) {
			this.handleMove(e);
		} else if (e.touches.length === 2) { // 双指缩放
			this.handlePinch(e);
		}
		e.preventDefault();
	}
	NonameGallery.prototype.handleTouchend = function (e) {
		if (e.touches.length === 0) {
			// 处理移动结束
			if (this.dragTarget === 'wrap') {
				this.handleWrapMoveEnd();
			} else {
				this.handleImgMoveEnd();
			}
			var now = Date.now();
			if (now - this.lastMoveTime < 100 && now - this.lastTwoFingersTime > 300) {
				this.handleInertial();
			}
			if (this.clickCount === 1 && now - this.startTime < 300) {
				this.singleClickTimer = setTimeout(function () {
					this.clickCount = 0;
					this.close()
				}.bind(this), 300);
			} else if (this.clickCount > 1) {
				this.clickCount = 0;
				this.handleZoom(this.start);
			}
		} else if (e.touches.length === 1) {
			this.lastMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		}
	}
	NonameGallery.prototype.handleTouchcancel = function () {
		// 微信浏览器长按呼出菜单
		this.clickCount = 0;
	}
	NonameGallery.prototype.handleResize = function () {
		this.setWindowSize();
		this.setPreviewList();
		for (var i = 0, length = this.imgList.length; i < length; i++) {
			var item = this.previewList[i];
			item.element = this.imgList[i];
			item.element.style.width = item.width + 'px';
			item.element.style.height = item.height + 'px';
			item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
			item.element.style.transition = 'none';
			item.element.style.cursor = 'zoom-in';
		}
		this.wrap.style.width = this.wrapWidth + 'px';
		this.wrap.style.transform = 'translate3d(' + this.wrapTranslateX + 'px, 0, 0)';
		this.wrap.style.transition = 'none';
		this.clickCount = 0;
	}
	NonameGallery.prototype.handleKeydown = function (e) {
		if (this.options.escToClose && e.keyCode === 27) {
			this.close();
		}
	}
	NonameGallery.prototype.handlePinch = function (e) {
		// 如果dragTarget = 'wrap' 或者下滑关闭时，禁止双指缩放
		if (this.dragTarget === 'wrap' || this.direction === 'v') return;
		this.lastTwoFingersTime = Date.now();
		var item = this.previewList[this.index];
		var touche = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		var touche2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
		var end = this.getDistance(touche, touche2);
		var start = this.getDistance(this.start, this.start2);
		var distanceRatio = end / start;
		var ratio = distanceRatio / this.lastDistanceRatio;
		this.scale = this.scale * ratio;
		if (this.scale > item.maxScale) {
			this.scale = item.maxScale;
			ratio = 1;
		} else if (this.scale < 0.7) {
			this.scale = 0.7;
			ratio = 1;
		}
		this.lastDistanceRatio = distanceRatio;

		var center = this.getCenter(touche, touche2);
		this.translate.x = this.translate.x - (ratio - 1) * (center.x - this.translate.x);
		this.translate.y = this.translate.y - (ratio - 1) * (center.y - this.translate.y);
		if (this.lastCenter) {
			this.translate.x = this.translate.x + center.x - this.lastCenter.x;
			this.translate.y = this.translate.y + center.y - this.lastCenter.y;
		}
		this.lastCenter = center;
		// 边界判断
		this.handleBoundary(item);
		item.element.style.transition = 'none';
		item.element.style.transform = 'translate3d(' + this.translate.x + 'px, ' + this.translate.y + 'px, 0) scale(' + this.scale + ')';
	}
	NonameGallery.prototype.handleBoundary = function (item) {
		const scaleWidth = this.scale * item.width;
		const scaleHeight = this.scale * item.height;
		if (scaleWidth > this.windowWidth) {
			if (this.translate.x > 0) {
				this.translate.x = 0
			} else if (this.translate.x < this.windowWidth - scaleWidth) {
				this.translate.x = this.windowWidth - scaleWidth;
			}
		} else {
			this.translate.x = (this.windowWidth - scaleWidth) / 2;
		}
		if (scaleHeight > this.windowHeight) {
			if (this.translate.y > 0) {
				this.translate.y = 0
			} else if (this.translate.y < this.windowHeight - scaleHeight) {
				this.translate.y = this.windowHeight - scaleHeight;
			}
		} else {
			this.translate.y = (this.windowHeight - scaleHeight) / 2;
		}
	}
	NonameGallery.prototype.getCenter = function (point, point2) {
		var x = (point.x + point2.x) / 2;
		var y = (point.y + point2.y) / 2;
		return { x: x, y: y }
	}
	NonameGallery.prototype.handleZoom = function (point) {
		var item = this.previewList[this.index];
		// 放至最大
		if (this.scale === 1) {
			var halfWindowWidth = Math.round(this.windowWidth / 2);
			var halfWindowHeight = Math.round(this.windowHeight / 2);
			var ix, iy, x, y;
			ix = Math.round((point.x - item.x) * item.maxScale);
			iy = Math.round((point.y - item.y) * item.maxScale);

			// 如果预览图片放大宽度 > 屏幕宽度
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

			// 如果预览图片最大高度 > 屏幕高度
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
			this.setTranslateScale(x, y, item.maxScale);
			item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
			item.element.style.transform = 'translate3d(' + x + 'px,' + y + 'px, 0) scale(' + item.maxScale + ')';
			item.element.style.cursor = 'zoom-out';
		} else { // 复原
			this.setTranslateScale(item.x, item.y, 1);
			item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
			item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
			item.element.style.cursor = 'zoom-in';
		}
	}
	NonameGallery.prototype.handleMove = function (e) {
		var x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
		var y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
		this.step.x = x - this.lastMove.x;
		this.step.y = y - this.lastMove.y;
		this.lastMove = { x: x, y: y };

		this.lastMoveTime = Date.now();
		this.stepSum.x += this.step.x;
		this.stepSum.y += this.step.y;
		if (Math.abs(this.stepSum.x) > 10 || Math.abs(this.stepSum.y) > 10) {
			this.clickCount = 0;
			// 获取移动方向
			this.getDirection();
			// 获取移动目标
			this.getDragTarget();
			// 处理移动中
			if (this.dragTarget === 'wrap') {
				this.handleWrapMove();
			} else {
				this.handleImgMove();
			}
		}
	}
	NonameGallery.prototype.getDistance = function (start, stop) {
		var x = stop.x - start.x;
		var y = stop.y - start.y;
		return Math.hypot(x, y); // Math.sqrt(x * x + y * y);
	}
	NonameGallery.prototype.getDirection = function () {
		if (this.direction === '') {
			if (Math.abs(this.stepSum.x) > Math.abs(this.stepSum.y)) {
				this.direction = 'h';
			} else {
				this.direction = 'v';
			}
		}
	}
	NonameGallery.prototype.getDragTarget = function () {
		if (this.dragTarget === '') {
			var scaleWidth = this.previewList[this.index].width * this.scale;
			if (this.direction === 'h' && this.scale >= 1 &&
				(scaleWidth <= this.windowWidth ||
					((this.step.x > 0 && this.translate.x === 0) || (this.step.x < 0 && this.translate.x === this.windowWidth - scaleWidth))
				)
			) {
				this.dragTarget = 'wrap';
			} else {
				this.dragTarget = 'img';
			}
		}
	}
	NonameGallery.prototype.handleWrapMove = function () {
		// 左右边界滑动时，增加阻力
		if ((this.step.x > 0 && this.wrapTranslateX > 0) ||
			(this.step.x < 0 && this.wrapTranslateX < (this.previewList.length - 1) * this.windowWidth * - 1)) {
			this.wrapTranslateX += this.step.x * 0.3;
		} else {
			// 双指交替滑动时，只能浏览上一个，下一个
			this.wrapTranslateX += this.step.x;
			var LEFT_X = (this.index - 1) * this.windowWidth * -1;
			var RIGHT_X = (this.index + 1) * this.windowWidth * -1;
			if (this.wrapTranslateX > LEFT_X) {
				this.wrapTranslateX = LEFT_X;
			} else if (this.wrapTranslateX < RIGHT_X) {
				this.wrapTranslateX = RIGHT_X;
			}
		}
		this.wrap.style.transition = 'none';
		this.wrap.style.transform = 'translate3d(' + this.wrapTranslateX + 'px, 0, 0)';
	}
	NonameGallery.prototype.handleImgMove = function () {
		this.translate.x += this.step.x;
		this.translate.y += this.step.y;
		var item = this.previewList[this.index];
		if (this.scale === 1) {
			if (this.direction === 'v') {
				var diffX = this.translate.x - item.x;
				var diffY = this.translate.y - item.y;
				var opacity = 1 - (Math.abs(diffY) / (this.windowHeight / 1.2));
				if (opacity < 0) {
					opacity = 0;
				}
				var x, y, scale;
				if (this.options.verticalZoom) {
					scale = opacity;
					x = item.x + diffX + (item.width - item.width * scale) / 2;
					y = item.y + diffY + (item.height - item.height * scale) / 2;
				} else {
					x = item.x;
					y = item.y + diffY;
					scale = 1;
				}
				this.bg.style.transition = 'none';
				this.bg.style.opacity = opacity;
				item.element.style.transition = 'none';
				item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px , 0) scale(' + scale + ')';
			}
		} else {
			this.handleBoundary(item);
			item.element.style.transition = 'none';
			item.element.style.transform = 'translate3d(' + Math.round(this.translate.x) + 'px, '
				+ Math.round(this.translate.y) + 'px, 0) scale(' + this.scale + ')';
		}
	}
	NonameGallery.prototype.handleWrapMoveEnd = function () {
		var MIN_SWIPE_DISTANCE = Math.round(this.windowWidth * 0.15);
		var lastScale = this.scale;
		var lastIndex = this.index;
		var lastItem = this.previewList[lastIndex];
		var diffX = this.wrapTranslateX - (this.index * this.windowWidth * -1);
		if (Math.abs(diffX) > MIN_SWIPE_DISTANCE) {
			if (diffX > 0) {
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
				this.setTranslateScale(item.x, item.y, 1);
				if (lastScale !== 1) {
					lastItem.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
					lastItem.element.style.transform = 'translate3d(' + lastItem.x + 'px, ' + lastItem.y + 'px, 0) scale(1)';
					lastItem.element.style.cursor = 'zoom-in';
				}
			}
		}
		this.wrapTranslateX = this.windowWidth * this.index * -1;
		this.wrap.style.transition = 'transform ' + this.options.duration + 'ms';
		this.wrap.style.transform = 'translate3d(' + this.wrapTranslateX + 'px, 0, 0)';
		this.counter.innerHTML = (this.index + 1) + ' / ' + this.previewList.length;
	}
	NonameGallery.prototype.handleImgMoveEnd = function () {
		var MIN_CLOSE_DISTANCE = Math.round(this.windowHeight * 0.15);
		var item = this.previewList[this.index];
		var diffY = this.translate.y - item.y;
		if (this.scale === 1 && this.direction === 'v' && Math.abs(diffY) > MIN_CLOSE_DISTANCE) {
			this.close();
		}
		if (this.scale < 1 || (this.scale === 1 && this.direction === 'v' && Math.abs(diffY) < MIN_CLOSE_DISTANCE)) {
			item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
			item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
			this.bg.style.opacity = '1';
			this.setTranslateScale(item.x, item.y, 1);
		}
	}
	NonameGallery.prototype.handleInertial = function () {
		var item = this.previewList[this.index];
		var scaleWidth = item.width * this.scale;
		var scaleHeight = item.height * this.scale;
		if (scaleWidth <= this.windowWidth && scaleHeight <= this.windowHeight) {
			return;
		}

		this.translate.x += this.step.x * 15;
		this.translate.y += this.step.y * 15;
		this.handleBoundary(item);
		item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out';
		item.element.style.transform = 'translate3d(' + this.translate.x + 'px, ' + this.translate.y + 'px, 0) scale(' + this.scale + ')';
	}

	if (typeof define === 'function' && define.amd) {
		define(function () { return NonameGallery; });
	} else if (typeof module === 'object' && typeof exports === 'object') {
		module.exports = NonameGallery;
	} else {
		window.NonameGallery = NonameGallery;
	}
})();