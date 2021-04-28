const nonameGallery = {
	container: null, // 容器 .noname-gallery-container
	bg: null, // 背景 .noname-gallery-bg
	wrap: null, // 包裹图片容器 .noname-gallery-wrap
	counter: null, // 计数器 当前第几张图片/图片总数
	imgList: null, // 预览图片列表
	// 全局变量
	data: {
		windowWidth: window.innerWidth, // 屏幕宽度
		windowHeight: window.innerHeight, // 屏幕高度
		/**
		 * previewList列表项属性介绍
		 * element HTMLImageElement
		 * x 预览图片左上角相对于视口的横坐标
		 * y 预览图片左上角相对于视口的纵坐标
		 * maxScale 预览图片最大比例
		 * width 预览图片显示宽度
		 * height 预览图片显示高度
		 * maxWidth 预览图片最大宽度
		 * maxHeight 预览图片最大高度
		 * thumbnail.x 缩略图左上角相对于视口的横坐标
		 * thumbnail.y 缩略图左上角相对于视口的纵坐标
		 * thumbnail.width 缩略图显示宽度
		 * thumbnail.height 缩略图显示高度
		 * thumbnail.scale 缩略图scale比例
		 */
		previewList: [], // 预览图片列表
		index: 0, // 预览图片索引
		wrapWidth: 0, // wrap 宽度
		wrapTranslateX: 0, // wrap x轴偏移量
		scale: 1, // 当前图片缩放值
		scaleWidth: 0, // 图片当前宽度
		scaleHeight: 0, // 图片当前高度
		opacity: 1, // 背景透明度
		translate: { x: 0, y: 0 }, // 当前图片旋转中心（已设置为左上角）相对屏幕左上角偏移值
		start: { x: 0, y: 0 }, // 第一根手指坐标
		start2: { x: 0, y: 0 }, // 第二根手指坐标
		step: { x: 0, y: 0 }, // 移动差值
		stepSum: { x: 0, y: 0 }, // 移动差值总和大于10判断滑动方向
		lastMove: { x: 0, y: 0 }, // 上一次移动
		lastCenter: null, // 上一次中心位置
		lastDistanceRatio: 1, // 上一次距离比例
		clickCount: 0, // 点击次数 1 = 单击 大于1 = 双击
		direction: '', // 方向 v: vertical h: horizontal
		dragTarget: '', // wrap，img
		isMousedown: false, // 是否按下鼠标
		singleClickTimer: null, // 计时器
		touchstartTime: null, // touchstart时间戳
		lastMoveTime: null, // 鼠标松开距离最后一次移动小于100ms执行惯性滑动
		lastTwoFingersTime: null, // 距离上一次双指在屏幕上小于300ms不执行惯性滑动
	},
	// 配置
	options: {
		list: [], // HTMLImageElement[]
		index: 0, // 索引
		showOpacity: true, // 淡入淡出
		zoomToScreenCenter: false, // 将放大区域移动到屏幕中心显示
		verticalZoom: false, // 垂直滑动缩放图片
		escToClose: true,
		useTransition: !true, // 使用transition实现动画或requestAnimationFrame
		minScale: 1.5, // 最小放大倍数
		duration: 300 // 动画持续时间
	},
	/**
	 * 初始化
	 * @param {object} options 
	 */
	init: function (options) {
		// 合并options
		Object.assign(this.options, options);

		if (this.options.list.length === 0) {
			throw new Error('options.list can not be empty array');
		}

		this.setWindowSize();

		this.setPreviewList();

		this.render();

		this.setProperties();

		this.open();

		this.bindEventListener();
	},
	/**
	 * 设置previewList
	 */
	setPreviewList: function () {
		// 渲染之前先保存缩略图的getBoundingClientRect信息
		this.data.previewList = [];
		for (let i = 0; i < this.options.list.length; i++) {
			const element = this.options.list[i];
			const rect = element.getBoundingClientRect();
			// 计算预览图片显示宽高
			const result = this.getImgSize(element.naturalWidth, element.naturalHeight);
			let maxScale = this.decimal(element.naturalWidth / result.width, 3);
			if (maxScale < this.options.minScale) {
				maxScale = this.options.minScale;
			}
			this.data.previewList[i] = {};
			const item = this.data.previewList[i];
			item.x = Math.round((this.data.windowWidth - result.width) / 2);
			item.y = Math.round((this.data.windowHeight - result.height) / 2);
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
			item.thumbnail.scale = this.decimal(rect.width / result.width, 3);
		}
		this.data.index = this.options.index;
		const item = this.data.previewList[this.data.index];
		this.setTranslateScale(item.x, item.y, 1, item.width, item.height);
		// wrap
		this.data.wrapWidth = this.data.previewList.length * this.data.windowWidth;
		this.data.wrapTranslateX = this.data.index * this.data.windowWidth * -1;
	},
	/**
	 * 渲染
	 */
	render: function () {
		let html = '<div class="noname-gallery-container">';
		if (this.options.useTransition) {
			html += '<div class="noname-gallery-bg" style="opacity: 0; transition: opacity ' + this.options.duration + 'ms;"></div>';
		} else {
			html += '<div class="noname-gallery-bg" style="opacity: 0;"></div>';
		}
		html += '<div class="noname-gallery-counter">' + (this.options.index + 1) + ' / ' + this.options.list.length + '</div>'
			+ '<ul class="noname-gallery-wrap" style="width: ' + this.data.wrapWidth
			+ 'px; transform: translate3d(' + this.data.wrapTranslateX + 'px, 0, 0)">';

		for (let i = 0; i < this.options.list.length; i++) {
			// 预览图片列表项
			const item = this.data.previewList[i];
			let cssText = '';
			if (this.options.useTransition) {
				cssText = 'width: ' + item.width + 'px;';
				cssText += 'height: ' + item.height + 'px;';
				if (this.data.index === i) {
					cssText += 'transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scale + ');';
				} else {
					cssText += 'transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1);';
				}
				cssText += 'transition: transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms;';
			} else {
				if (this.data.index === i) {
					cssText = 'width: ' + item.thumbnail.width + 'px; height: ' + item.thumbnail.height + 'px;';
					cssText += 'transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0)';
				} else {
					cssText = 'width: ' + item.width + 'px; height: ' + item.height + 'px;';
					cssText += 'transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0)';
				}
			}
			html += '<li>'
				+ '<img class="noname-gallery-img" src="' + this.options.list[i].src + '" alt="" style="' + cssText + '">'
				+ '</li>';
		}
		html += '</ul></div>';

		document.body.insertAdjacentHTML('beforeend', html);
	},
	/**
	 * 设置属性值
	 */
	setProperties: function () {
		this.container = document.querySelector('.noname-gallery-container');
		this.wrap = document.querySelector('.noname-gallery-wrap');
		this.bg = document.querySelector('.noname-gallery-bg');
		this.counter = document.querySelector('.noname-gallery-counter');
		this.imgList = document.querySelectorAll('.noname-gallery-img');
		for (let i = 0; i < this.imgList.length; i++) {
			this.data.previewList[i].element = this.imgList[i];
		}
	},
	/**
	 * 打开
	 */
	open: function () {
		// 当前预览图片
		const item = this.data.previewList[this.data.index];
		// 如果使用过渡实现动画
		if (this.options.useTransition) {
			// 如果开启淡入淡出
			if (this.options.showOpacity) {
				item.element.style.opacity = '0';
			}
			// 强制重绘，否则合并计算样式，导致无法触发过渡效果，或使用setTimeout，个人猜测最短时长等于，1000 / 60 = 16.66666 ≈ 17
			window.getComputedStyle(item.element).opacity;

			this.bg.style.opacity = '1';
			item.element.style.opacity = '1';
			item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
		} else {
			const obj = {
				bg: {
					opacity: { from: 0, to: 1 }
				},
				img: {
					opacity: { from: 1, to: 1 },
					width: { from: item.thumbnail.width, to: item.width },
					height: { from: item.thumbnail.height, to: item.height },
					x: { from: item.thumbnail.x, to: item.x },
					y: { from: item.thumbnail.y, to: item.y }
				},
				type: 'bgAndImg'
			}
			if (this.options.showOpacity) {
				obj.img.opacity.from = 0;
			}
			this.raf(obj);
		}
	},
	/**
	 * 关闭
	 */
	close: function () {
		const item = this.data.previewList[this.data.index];
		if (this.options.useTransition) {
			if (this.options.showOpacity) {
				item.element.style.opacity = '0';
			}
			item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
			item.element.style.transform = 'translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scale + ')';
			this.bg.style.opacity = '0';
		} else {
			const obj = {
				bg: {
					opacity: { from: this.data.opacity, to: 0 }
				},
				img: {
					opacity: { from: 1, to: 1 },
					width: { from: this.data.scaleWidth, to: item.thumbnail.width },
					height: { from: this.data.scaleHeight, to: item.thumbnail.height },
					x: { from: this.data.translate.x, to: item.thumbnail.x },
					y: { from: this.data.translate.y, to: item.thumbnail.y },
				},
				type: 'bgAndImg'
			}
			if (this.options.showOpacity) {
				obj.img.opacity.to = 0;
			}
			if (this.options.verticalZoom) {
				obj.img.x.from = this.data.translate.x + (item.width - this.data.scaleWidth) / 2;
				obj.img.y.from = this.data.translate.y + (item.height - this.data.scaleHeight) / 2;
			}
			this.raf(obj);
		}
		// 移除事件
		this.unbindEventListener();
		setTimeout(() => {
			// 移除dom
			this.container.remove();
		}, this.options.duration);
	},
	/**
	 * 绑定事件
	 */
	bindEventListener: function () {
		this.handleMousedown = this.handleMousedown.bind(this);
		this.handleMousemove = this.handleMousemove.bind(this);
		this.handleMouseup = this.handleMouseup.bind(this);
		this.handleTouchstart = this.handleTouchstart.bind(this);
		this.handleTouchmove = this.handleTouchmove.bind(this);
		this.handleTouchend = this.handleTouchend.bind(this);
		this.handleTouchcancel = this.handleTouchcancel.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.handleKeydown = this.handleKeydown.bind(this);

		document.addEventListener('mousedown', this.handleMousedown);
		document.addEventListener('mousemove', this.handleMousemove);
		document.addEventListener('mouseup', this.handleMouseup);
		this.container.addEventListener('touchstart', this.handleTouchstart);
		this.container.addEventListener('touchmove', this.handleTouchmove);
		this.container.addEventListener('touchend', this.handleTouchend);
		this.container.addEventListener('touchcancel', this.handleTouchcancel);
		window.addEventListener('resize', this.handleResize);
		window.addEventListener('orientationchange', this.handleResize);
		window.addEventListener('keydown', this.handleKeydown);
	},
	/**
	 * 移除事件
	 */
	unbindEventListener: function () {
		document.removeEventListener('mousedown', this.handleMousedown);
		document.removeEventListener('mousemove', this.handleMousemove);
		document.removeEventListener('mouseup', this.handleMouseup);
		this.container.removeEventListener('touchstart', this.handleTouchstart);
		this.container.removeEventListener('touchmove', this.handleTouchmove);
		this.container.removeEventListener('touchend', this.handleTouchend);
		this.container.removeEventListener('touchcancel', this.handleTouchcancel);
		window.removeEventListener('resize', this.handleResize);
		window.removeEventListener('orientationchange', this.handleResize);
		window.removeEventListener('keydown', this.handleKeydown);
	},
	/**
	 * 设置当前图片坐标和缩放值
	 * @param {number} x 横坐标
	 * @param {number} y 纵坐标
	 * @param {number} scale 缩放值
	 */
	setTranslateScale: function (x, y, scale, w, h) {
		this.data.translate = { x: x, y: y };
		this.data.scale = scale;
		this.data.scaleWidth = w;
		this.data.scaleHeight = h;
	},
	/**
	 * 处理mousedown
	 * @param {MouseEvent} e
	 */
	handleMousedown: function (e) {
		// console.log(e.type);
		// e.button 0 = 左键 1 = 滚轮 2 = 右键
		if (e.button === 0) {
			this.data.start = { x: e.clientX, y: e.clientY };
			this.data.lastMove = { x: e.clientX, y: e.clientY };
			this.data.stepSum = { x: 0, y: 0 };
			this.data.clickCount = 1;
			this.data.isMousedown = true;
			this.data.direction = '';
			this.data.dragTarget = '';
		}
	},
	/**
	 * 处理mousemove
	 * @param {MouseEvent} e
	 */
	handleMousemove: function (e) {
		// console.log(e.type);
		e.preventDefault();
		if (this.data.isMousedown) {
			this.data.clickCount = 0;
			this.data.lastMoveTime = Date.now();
			this.handleMove(e);
		}
	},
	/**
	 * 处理mouseup
	 * @param {MouseEvent} e
	 */
	handleMouseup: function (e) {
		// console.log(e.type);
		if (e.button === 0) {
			this.data.isMousedown = false;
			this.handleMoveEnd();
			if (this.data.clickCount !== 0) {
				if (e.target.className === 'noname-gallery-img') {
					this.handleZoom({ x: e.clientX, y: e.clientY });
				} else {
					this.close();
				}
			}
			if (Date.now() - this.data.lastMoveTime < 100) {
				this.handleInertial();
			}
		}
	},
	/**
	 * 处理touchstart
	 * @param {TouchEvent} e
	 */
	handleTouchstart: function (e) {
		// console.log(e.type);
		this.data.start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		this.data.lastMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		if (e.touches.length === 1) {
			this.data.stepSum = { x: 0, y: 0 };
			this.data.direction = '';
			this.data.dragTarget = '';

			this.data.touchstartTime = Date.now();
			clearTimeout(this.data.singleClickTimer);
			this.data.clickCount++;
		} else if (e.touches.length === 2) {
			this.data.start2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
			this.data.clickCount = 0;
			this.data.lastDistanceRatio = 1;
			this.data.lastCenter = null;
		}
	},
	/**
	 * 处理touchmove
	 * @param {TouchEvent} e
	 */
	handleTouchmove: function (e) {
		// console.log(e.type);
		e.preventDefault();
		this.data.clickCount = 0;
		// 一根手指
		if (e.touches.length === 1) {
			this.handleMove(e);
		} else if (e.touches.length === 2) { // 双指缩放
			this.handlePinch(e);
		}
	},
	/**
	 * 处理touchend
	 * @param {TouchEvent} e
	 */
	handleTouchend: function (e) {
		// console.log(e.type);
		e.preventDefault();
		if (e.touches.length === 0) {
			// 处理移动结束
			this.handleMoveEnd();
			const now = Date.now();
			if (now - this.data.lastMoveTime < 100 && now - this.data.lastTwoFingersTime > 300) {
				this.handleInertial();
			}
			if (now - this.data.touchstartTime < 300) {
				if (this.data.clickCount === 1) {
					this.data.singleClickTimer = setTimeout(() => {
						this.data.clickCount = 0;
						this.close()
					}, 300);
				} else if (this.data.clickCount > 1) {
					this.data.clickCount = 0;
					this.handleZoom(this.data.start);
				}
			}
		} else if (e.touches.length === 1) {
			this.data.lastMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		}
	},
	/**
	 * 处理touchcancel
	 */
	handleTouchcancel: function () {
		// 微信浏览器长按呼出菜单
		this.data.clickCount = 0;
	},
	/**
	 * 窗口大小变化旋转时触发
	 */
	handleResize: function () {
		this.setWindowSize();
		this.setPreviewList();
		for (let i = 0; i < this.imgList.length; i++) {
			const item = this.data.previewList[i];
			item.element = this.imgList[i];
			item.element.style.width = item.width + 'px';
			item.element.style.height = item.height + 'px';
			item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
			item.element.style.transition = 'none';
			item.element.style.cursor = 'zoom-in';
		}
		this.wrap.style.width = this.data.wrapWidth + 'px';
		this.wrap.style.transform = 'translate3d(' + this.data.wrapTranslateX + 'px, 0, 0)';
		this.wrap.style.transition = 'none';
		this.data.clickCount = 0;
	},
	/**
	 * esc退出
	 * @param {*} e 
	 */
	handleKeydown: function (e) {
		if (this.options.escToClose && e.keyCode === 27) {
			this.close();
		}
	},
	/**
	 * 最大/复原
	 * @param {object} point
	 * @param {number} point.x
	 * @param {number} point.y
	 */
	handleZoom: function (point) {
		const item = this.data.previewList[this.data.index];
		// 放至最大
		if (this.data.scale === 1) {
			let ix, iy, x, y;
			const halfWindowWidth = Math.round(this.data.windowWidth / 2);
			const halfWindowHeight = Math.round(this.data.windowHeight / 2);

			// 根据点击位置求放大图片后的位置
			// 如果点击位置的横坐标=100 图片距离左边的距离=20  相对图片的横坐标=80（100-20） 相对放大图片的横坐标=80*item.maxScale
			ix = Math.round((point.x - item.x) * item.maxScale);
			iy = Math.round((point.y - item.y) * item.maxScale);

			// 如果预览图片放大宽度 > 屏幕宽度
			if (item.maxWidth > this.data.windowWidth) {
				if (this.options.zoomToScreenCenter) {
					x = halfWindowWidth - ix;
				} else {
					x = point.x - ix;
				}
				if (x > 0) {
					x = 0;
				} else if (x < this.data.windowWidth - item.maxWidth) {
					x = this.data.windowWidth - item.maxWidth;
				}
			} else {
				x = Math.round((this.data.windowWidth - item.maxWidth) / 2);
			}

			// 如果预览图片最大高度 > 屏幕高度
			if (item.maxHeight > this.data.windowHeight) {
				if (this.options.zoomToScreenCenter) {
					y = halfWindowHeight - iy;
				} else {
					y = point.y - iy;
				}
				if (y > 0) {
					y = 0;
				} else if (y < this.data.windowHeight - item.maxHeight) {
					y = this.data.windowHeight - item.maxHeight;
				}
			} else {
				y = Math.round((this.data.windowHeight - item.maxHeight) / 2);
			}
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + x + 'px,' + y + 'px, 0) scale(' + item.maxScale + ')';
			} else {
				const obj = {
					img: {
						opacity: { from: 1, to: 1 },
						width: { from: item.width, to: item.maxWidth },
						height: { from: item.height, to: item.maxHeight },
						x: { from: item.x, to: x },
						y: { from: item.y, to: y }
					},
					type: 'img'
				}
				this.raf(obj);
			}
			item.element.style.cursor = 'zoom-out';
			this.setTranslateScale(x, y, item.maxScale, item.maxWidth, item.maxHeight);
		} else { // 复原
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
			} else {
				const obj = {
					img: {
						opacity: { from: 1, to: 1 },
						width: { from: this.data.scaleWidth, to: item.width },
						height: { from: this.data.scaleHeight, to: item.height },
						x: { from: this.data.translate.x, to: item.x },
						y: { from: this.data.translate.y, to: item.y }
					},
					type: 'img'
				}
				this.raf(obj);
			}
			item.element.style.cursor = 'zoom-in';
			this.setTranslateScale(item.x, item.y, 1, item.width, item.height);
		}
	},
	/**
	 * 鼠标或单指移动
	 */
	handleMove: function (e) {
		const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
		const y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
		this.data.step.x = x - this.data.lastMove.x;
		this.data.step.y = y - this.data.lastMove.y;
		this.data.lastMove = { x: x, y: y };
		this.data.lastMoveTime = Date.now();
		this.data.stepSum.x += this.data.step.x;
		this.data.stepSum.y += this.data.step.y;
		if (Math.abs(this.data.stepSum.x) > 10 || Math.abs(this.data.stepSum.y) > 10) {
			// 获取移动方向
			this.getDirection();
			// 获取移动目标
			this.getDragTarget();
			// 处理移动中
			if (this.data.dragTarget === 'wrap') {
				this.handleWrapMove();
			} else {
				this.handleImgMove();
			}
		}
	},
	/**
	 * 双指缩放、移动
	 */
	handlePinch: function (e) {
		// 如果dragTarget = 'wrap' 或者下滑关闭时，禁止双指缩放
		if (this.data.dragTarget === 'wrap' || this.data.direction === 'v') return;
		this.data.lastTwoFingersTime = Date.now();
		const item = this.data.previewList[this.data.index];
		const touche = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		const touche2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
		let end = this.getDistance(touche, touche2);
		let start = this.getDistance(this.data.start, this.data.start2);
		const distanceRatio = end / start;
		var ratio = distanceRatio / this.data.lastDistanceRatio;

		this.data.scale = this.data.scale * ratio;
		this.data.scaleWidth *= ratio;
		this.data.scaleHeight *= ratio;
		if (this.data.scale > item.maxScale) {
			this.data.scale = item.maxScale;
			ratio = 1;
		} else if (this.data.scale < 0.7) {
			this.data.scale = 0.7;
			ratio = 1;
		}

		if (this.data.scaleWidth > item.maxWidth) {
			this.data.scaleWidth = item.maxWidth;
		} else if (this.data.scaleWidth < item.width * 0.7) {
			this.data.scaleWidth = item.width * 0.7;
		}
		if (this.data.scaleHeight > item.maxHeight) {
			this.data.scaleHeight = item.maxHeight;
		} else if (this.data.scaleHeight < item.height * 0.7) {
			this.data.scaleHeight = item.height * 0.7;
		}

		this.data.lastDistanceRatio = distanceRatio;
		const center = this.getCenter(touche, touche2);
		this.data.translate.x = this.data.translate.x - (ratio - 1) * (center.x - this.data.translate.x);
		this.data.translate.y = this.data.translate.y - (ratio - 1) * (center.y - this.data.translate.y);
		if (this.data.lastCenter) {
			this.data.translate.x = this.data.translate.x + center.x - this.data.lastCenter.x;
			this.data.translate.y = this.data.translate.y + center.y - this.data.lastCenter.y;
		}
		this.data.lastCenter = center;
		// 处理边界
		this.handleBoundary(item);
		if (this.options.useTransition) {
			item.element.style.transition = 'none';
			item.element.style.transform = 'translate3d(' + this.data.translate.x + 'px, ' + this.data.translate.y + 'px, 0) scale(' + this.data.scale + ')';
		} else {
			item.element.style.width = this.data.scaleWidth + 'px';
			item.element.style.height = this.data.scaleHeight + 'px';
			item.element.style.transform = 'translate3d(' + this.data.translate.x + 'px, ' + this.data.translate.y + 'px, 0)';
		}
	},
	/**
	 * 处理边界
	 */
	handleBoundary: function (item) {
		const scaleWidth = this.data.scale * item.width;
		const scaleHeight = this.data.scale * item.height;
		if (scaleWidth > this.data.windowWidth) {
			if (this.data.translate.x > 0) {
				this.data.translate.x = 0
			} else if (this.data.translate.x < this.data.windowWidth - scaleWidth) {
				this.data.translate.x = this.data.windowWidth - scaleWidth;
			}
		} else {
			this.data.translate.x = (this.data.windowWidth - scaleWidth) / 2;
		}
		if (scaleHeight > this.data.windowHeight) {
			if (this.data.translate.y > 0) {
				this.data.translate.y = 0
			} else if (this.data.translate.y < this.data.windowHeight - scaleHeight) {
				this.data.translate.y = this.data.windowHeight - scaleHeight;
			}
		} else {
			this.data.translate.y = (this.data.windowHeight - scaleHeight) / 2;
		}
	},
	/**
	 * 获取两点距离
	 * @param {object} start
	 * @param {number} start.x
	 * @param {number} start.y
	 * @param {object} stop
	 * @param {number} stop.x
	 * @param {number} stop.y
	 * @returns
	 */
	getDistance: function (start, stop) {
		let x = stop.x - start.x;
		let y = stop.y - start.y;
		return Math.hypot(x, y); // Math.sqrt(x * x + y * y);
	},
	/**
	 * 获取图片缩放宽高
	 * @param {number} naturalWidth 图片实际宽度
	 * @param {number} naturalHeight 图片实际高度
	 * @returns
	 */
	getImgSize: function (naturalWidth, naturalHeight) {
		const ratio = naturalWidth / naturalHeight;
		const windowRatio = this.data.windowWidth / this.data.windowHeight;
		let width, height;
		// 如果图片实际宽高比例 >= 屏幕宽高比例
		if (ratio >= windowRatio) {
			if (naturalWidth > this.data.windowWidth) {
				width = this.data.windowWidth;
				height = this.data.windowWidth / naturalWidth * naturalHeight;
			} else {
				width = naturalWidth;
				height = naturalHeight;
			}
		} else {
			if (naturalHeight > this.data.windowHeight) {
				width = this.data.windowHeight / naturalHeight * naturalWidth;
				height = this.data.windowHeight;
			} else {
				width = naturalWidth;
				height = naturalHeight;
			}
		}
		return { width: width, height: height }
	},
	/**
	 * 获取移动方向
	 */
	getDirection: function () {
		if (this.data.direction === '') {
			if (Math.abs(this.data.stepSum.x) > Math.abs(this.data.stepSum.y)) {
				this.data.direction = 'h';
			} else {
				this.data.direction = 'v';
			}
			// console.log(this.data.direction);
		}
	},
	/**
	 * 获取移动目标 wrap or img
	 */
	getDragTarget: function () {
		if (this.data.dragTarget === '') {
			const scaleWidth = this.data.previewList[this.data.index].width * this.data.scale;
			if (this.data.direction === 'h' &&
				this.data.scale >= 1 &&
				(scaleWidth <= this.data.windowWidth ||
					((this.data.step.x > 0 && this.data.translate.x === 0) || (this.data.step.x < 0 && this.data.translate.x === this.data.windowWidth - scaleWidth))
				)
			) {
				this.data.dragTarget = 'wrap';
			} else {
				this.data.dragTarget = 'img';
			}
		}
	},
	/**
	 * 处理移动结束
	 */
	handleMoveEnd: function () {
		if (this.data.dragTarget === 'wrap') {
			this.handleWrapMoveEnd();
		} else {
			this.handleImgMoveEnd();
		}
	},
	/**
	 * 处理wrap移动
	 */
	handleWrapMove: function () {
		// 左右边界滑动时，增加阻力
		if ((this.data.step.x > 0 && this.data.wrapTranslateX > 0) ||
			(this.data.step.x < 0 && this.data.wrapTranslateX < (this.data.previewList.length - 1) * this.data.windowWidth * - 1)) {
			this.data.wrapTranslateX += this.data.step.x * 0.3;
		} else {
			// 双指交替滑动时，只能浏览上一个，下一个
			this.data.wrapTranslateX += this.data.step.x;
			const LEFT_X = (this.data.index - 1) * this.data.windowWidth * -1;
			const RIGHT_X = (this.data.index + 1) * this.data.windowWidth * -1;
			if (this.data.wrapTranslateX > LEFT_X) {
				this.data.wrapTranslateX = LEFT_X;
			} else if (this.data.wrapTranslateX < RIGHT_X) {
				this.data.wrapTranslateX = RIGHT_X;
			}
		}
		this.wrap.style.transition = 'none';
		this.wrap.style.transform = 'translate3d(' + this.data.wrapTranslateX + 'px, 0, 0)';
	},
	/**
	 * 处理img移动
	 */
	handleImgMove: function () {
		this.data.translate.x += this.data.step.x;
		this.data.translate.y += this.data.step.y;
		const item = this.data.previewList[this.data.index];
		if (this.data.scale === 1) {
			if (this.data.direction === 'v') {
				const diffX = this.data.translate.x - item.x;
				const diffY = this.data.translate.y - item.y;
				this.data.opacity = 1 - (Math.abs(diffY) / (this.data.windowHeight / 1.2));
				if (this.data.opacity < 0) {
					this.data.opacity = 0;
				}
				let x, y, scale;
				if (this.options.verticalZoom) {
					if (this.options.useTransition) {
						scale = this.data.opacity;
						x = item.x + diffX + (item.width - item.width * scale) / 2;
						y = item.y + diffY + (item.height - item.height * scale) / 2;
					} else {
						this.data.scaleWidth = item.width * this.data.opacity;
						this.data.scaleHeight = item.height * this.data.opacity;
						x = item.x + diffX + (item.width - this.data.scaleWidth) / 2;
						y = item.y + diffY + (item.height - this.data.scaleHeight) / 2;
					}
				} else {
					x = item.x;
					y = item.y + diffY;
					scale = 1;
				}
				this.bg.style.opacity = this.data.opacity;
				if (this.options.useTransition) {
					this.bg.style.transition = 'none';
					item.element.style.transition = 'none';
					item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px , 0) scale(' + scale + ')';
				} else {
					item.element.style.width = this.data.scaleWidth + 'px';
					item.element.style.height = this.data.scaleHeight + 'px';
					item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px , 0)';
				}
			}
		} else {
			this.handleBoundary(item);
			if (this.options.useTransition) {
				item.element.style.transition = 'none';
				item.element.style.transform = 'translate3d(' + this.data.translate.x + 'px, ' + this.data.translate.y + 'px, 0) scale(' + this.data.scale + ')';
			} else {
				item.element.style.transform = 'translate3d(' + this.data.translate.x + 'px, ' + this.data.translate.y + 'px, 0)';
			}
		}
	},
	/**
	 * wrap移动结束
	 */
	handleWrapMoveEnd: function () {
		const MIN_SWIPE_DISTANCE = Math.round(this.data.windowWidth * 0.15);
		const lastScale = this.data.scale;
		const lastIndex = this.data.index;
		const lastItem = this.data.previewList[lastIndex];
		const diffX = this.data.wrapTranslateX - (this.data.index * this.data.windowWidth * -1);
		if (Math.abs(diffX) > MIN_SWIPE_DISTANCE) {
			if (diffX > 0) {
				if (lastIndex > 0) {
					this.data.index--;
				}
			} else {
				if (lastIndex < this.data.previewList.length - 1) {
					this.data.index++;
				}
			}
			// 切换时，如果之前图片放大过，则恢复
			if (lastIndex !== this.data.index) {
				const item = this.data.previewList[this.data.index];
				if (lastScale !== 1) {
					if (this.options.useTransition) {
						lastItem.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
						lastItem.element.style.transform = 'translate3d(' + lastItem.x + 'px, ' + lastItem.y + 'px, 0) scale(1)';
					} else {
						const obj = {
							img: {
								opacity: { from: 1, to: 1 },
								width: { from: this.data.scaleWidth, to: lastItem.width },
								height: { from: this.data.scaleHeight, to: lastItem.height },
								x: { from: this.data.translate.x, to: lastItem.x },
								y: { from: this.data.translate.y, to: lastItem.y }
							},
							type: 'img'
						}
						this.raf(obj);
					}
					lastItem.element.style.cursor = 'zoom-in';
				}
				this.setTranslateScale(item.x, item.y, 1, item.width, item.height);
			}
		}
		let x = this.data.windowWidth * this.data.index * -1;
		if (this.options.useTransition) {
			this.wrap.style.transition = 'transform ' + this.options.duration + 'ms';
			this.wrap.style.transform = 'translate3d(' + x + 'px, 0, 0)';
		} else {
			const obj = {
				wrap: {
					x: { from: this.data.wrapTranslateX, to: x }
				},
				type: 'wrap'
			}
			this.raf(obj);
		}
		this.data.wrapTranslateX = x;
		this.counter.innerHTML = (this.data.index + 1) + ' / ' + this.data.previewList.length;
	},
	/**
	 * img移动结束
	 */
	handleImgMoveEnd: function () {
		const MIN_CLOSE_DISTANCE = Math.round(this.data.windowHeight * 0.15);
		const item = this.data.previewList[this.data.index];
		const diffY = this.data.translate.y - item.y;
		if (this.data.scale === 1 && this.data.direction === 'v' && Math.abs(diffY) > MIN_CLOSE_DISTANCE) {
			this.close();
		}
		if (this.data.scale < 1 || (this.data.scale === 1 && this.data.direction === 'v' && Math.abs(diffY) < MIN_CLOSE_DISTANCE)) {
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
				this.bg.style.opacity = '1';
			} else {
				const obj = {
					bg: {
						opacity: { from: this.data.opacity, to: 1 }
					},
					img: {
						opacity: { from: 1, to: 1 },
						width: { from: this.data.scaleWidth, to: item.width },
						height: { from: this.data.scaleHeight, to: item.height },
						x: { from: item.x, to: item.x },
						y: { from: this.data.translate.y, to: item.y }
					},
					type: 'bgAndImg'
				}
				if (this.options.verticalZoom) {
					obj.img.x.from = item.x + (item.width - this.data.scaleWidth) / 2;
					obj.img.y.from = this.data.translate.y + (item.height - this.data.scaleHeight) / 2;
				}
				if (this.data.scale < 1) {
					obj.img.x.from = this.data.translate.x;
					obj.img.y.from = this.data.translate.y;
				}
				this.raf(obj);
			}
			this.setTranslateScale(item.x, item.y, 1, item.width, item.height);
		}
	},
	/**
	 * 处理惯性滚动
	 */
	handleInertial: function () {
		const item = this.data.previewList[this.data.index];
		const scaleWidth = item.width * this.data.scale;
		const scaleHeight = item.height * this.data.scale;
		if (scaleWidth <= this.data.windowWidth && scaleHeight <= this.data.windowHeight) {
			return;
		}
		const x = this.data.translate.x;
		const y = this.data.translate.y;
		this.data.translate.x += this.data.step.x * 15;
		this.data.translate.y += this.data.step.y * 15;
		this.handleBoundary(item);
		if (this.options.useTransition) {
			item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out';
			item.element.style.transform = 'translate3d(' + this.data.translate.x + 'px, ' + this.data.translate.y + 'px, 0) scale(' + this.data.scale + ')';
		} else {
			const obj = {
				img: {
					opacity: { from: 1, to: 1 },
					width: { from: this.data.scaleWidth, to: this.data.scaleWidth },
					height: { from: this.data.scaleHeight, to: this.data.scaleHeight },
					x: { from: x, to: this.data.translate.x },
					y: { from: y, to: this.data.translate.y }
				},
				type: 'img'
			}
			this.raf(obj);
		}
	},
	/**
	 * 保留n位小数
	 * @param {number} num 数值
	 * @param {number} n 保留n位小数
	 * @returns
	 */
	decimal: function (num, n) {
		const x = Math.pow(10, n);
		return Math.round(num * x) / x;
	},
	/**
	 * 获取两点中心点坐标
	 * @param {object} point
	 * @param {number} point.x
	 * @param {number} point.y
	 * @param {object} point2
	 * @param {number} point2.x
	 * @param {number} point2.y
	 * @returns 
	 */
	getCenter: function (point, point2) {
		const x = (point.x + point2.x) / 2;
		const y = (point.y + point2.y) / 2;
		return { x: x, y: y }
	},
	/**
	 * 设置窗口大小
	 */
	setWindowSize: function () {
		this.data.windowWidth = window.innerWidth;
		this.data.windowHeight = window.innerHeight;
	},
	/**
	 * 动画函数 先慢后快
	 * @param {*} t 当前时间
	 * @param {*} b 初始值
	 * @param {*} c 变化量
	 * @param {*} d 持续时间
	 * @returns 
	 */
	easeIn: function (t, b, c, d) {
		return c * (t /= d) * t + b;
	},
	/**
	 * 动画函数 先快后慢
	 * @param {*} from 起始位置
	 * @param {*} to 结束位置
	 * @param {*} time 动画当前时间
	 * @param {*} duration 动画持续时间
	 * @returns
	 */
	easeOut: function (from, to, time, duration) {
		let change = to - from;
		return -change * (time /= duration) * (time - 2) + from;
	},
	/**
	 * raf 动画
	 * @param {object} obj 参数
	 */
	raf: function (obj) {
		let self = this;
		let start;
		let count = 0;
		function step(timestamp) {
			if (start === undefined) {
				start = timestamp;
			}
			let time = timestamp - start;
			if (time > self.options.duration) {
				time = self.options.duration;
				count++;
			}
			if (count < 2) {
				if (obj.type === 'bgAndImg') {
					self.bgAnimate(obj, time, self.options.duration);
					self.imgAnimate(obj, time, self.options.duration);
				} else if (obj.type === 'wrap') {
					self.wrapAnimate(obj, time, self.options.duration);
				} else if (obj.type === 'img') {
					self.imgAnimate(obj, time, self.options.duration);
				}
				window.requestAnimationFrame(step);
			}
		}
		window.requestAnimationFrame(step);
	},
	/**
	 * bg opacity动画
	 * @param {object} obj 
	 * @param {number} time 动画当前时间
	 * @param {number} duration 动画持续时间
	 */
	bgAnimate: function (obj, time, duration) {
		let opacity = this.easeOut(obj.bg.opacity.from, obj.bg.opacity.to, time, duration);
		this.bg.style.opacity = opacity;
	},
	/**
	 * wrap滑动动画
	 * @param {object} obj
	 * @param {number} time 动画当前时间
	 * @param {number} duration 动画持续时间
	 */
	wrapAnimate: function (obj, time, duration) {
		let x = this.easeOut(obj.wrap.x.from, obj.wrap.x.to, time, duration);
		this.wrap.style.transform = 'translate3d(' + x + 'px, 0, 0)';
	},
	/**
	 * img zoom动画
	 * @param {object} obj
	 * @param {number} time 动画当前时间
	 * @param {number} duration 动画持续时间
	 */
	imgAnimate: function (obj, time, duration) {
		let opacity = this.easeOut(obj.img.opacity.from, obj.img.opacity.to, time, duration);
		let width = this.easeOut(obj.img.width.from, obj.img.width.to, time, duration);
		let height = this.easeOut(obj.img.height.from, obj.img.height.to, time, duration);
		let x = this.easeOut(obj.img.x.from, obj.img.x.to, time, duration);
		let y = this.easeOut(obj.img.y.from, obj.img.y.to, time, duration);
		const item = this.data.previewList[this.data.index];
		item.element.style.opacity = opacity;
		item.element.style.width = width + 'px';
		item.element.style.height = height + 'px';
		item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
	}
}