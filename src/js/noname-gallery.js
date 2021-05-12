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
		 * maxScale 预览图片最大缩放比例
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
		currentImg: {
			x: 0, // 当前图片旋转中心（已设置为左上角）相对屏幕左上角偏移值
			y: 0, // 当前图片旋转中心（已设置为左上角）相对屏幕左上角偏移值
			width: 0, // 图片当前高度
			height: 0, // 图片当前宽度
			scale: 0, // 当前图片缩放值
			status: '' // 图片当前状态 shrink=当前图片scale<1 verticalToClose=垂直滑动图片关闭画廊 inertia=惯性滑动
		},
		bgOpacity: 1, // 背景透明度
		start: { x: 0, y: 0 }, // 第一根手指坐标
		start2: { x: 0, y: 0 }, // 第二根手指坐标
		step: { x: 0, y: 0 }, // 相对于上一次移动差值
		distance: { x: 0, y: 0 }, // 相对于第一次点击位置移动距离
		lastDistance: { x: 0, y: 0 }, // 双指滑动时记录上一次移动距离
		lastMove: { x: 0, y: 0 }, // 上一次移动
		lastCenter: null, // 上一次双指中心位置
		lastDistanceRatio: 1, // 上一次双指距离比例
		clickCount: 0, // 点击次数 1 = 单击 大于1 = 双击
		direction: '', // 方向 v: vertical h: horizontal
		dragTarget: '', // wrap，img
		isDown: false, // 是否触发touchstart或mousedown，为true时执行touchmove或mousemove
		singleClickTimer: null, // 计时器
		startTime: null, // touchstart时间戳
		lastMoveTime: null, // 鼠标松开距离最后一次移动小于100ms执行惯性滑动
		rafId: null // requestAnimationFrame id
	},
	// 配置
	options: {
		list: [], // HTMLImageElement[]
		index: 0, // 索引
		fadeInOut: true, // 淡入淡出
		useTransition: true, // 使用transition实现动画或requestAnimationFrame
		verticalZoom: true, // 垂直滑动缩放图片
		openKeyboard: true, // 开启键盘 esc关闭，方向键切换图片
		zoomToScreenCenter: false, // 将放大区域移动到屏幕中心显示
		duration: 300, // 动画持续时间
		minScale: 1.5 // 最小放大倍数
	},
	/**
	 * 初始化
	 * @param {object} options 
	 */
	init: function (options) {
		// 合并options
		Object.assign(this.options, options);
		// 错误处理
		if (this.options.list.length === 0) {
			throw new Error('options.list can not be empty array');
		}
		// 设置窗口大小
		this.setWindowSize();
		// 设置previewList
		this.setPreviewList();
		// 设置当前图片坐标和缩放值
		this.data.index = this.options.index;
		const item = this.data.previewList[this.data.index];
		this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		// 设置wrap宽度和偏移量
		this.setWrap();
		// 渲染
		this.render();
		// 设置属性值
		this.setProperties();
		// 打开画廊
		this.open();
		// 事件绑定
		this.bindEventListener();
	},
	/**
	 * 设置窗口大小
	 */
	setWindowSize: function () {
		this.data.windowWidth = window.innerWidth;
		this.data.windowHeight = window.innerHeight;
	},
	/**
	 * 设置previewList
	 */
	setPreviewList: function () {
		// 渲染之前先保存缩略图的getBoundingClientRect信息
		this.data.previewList = [];
		for (let i = 0, length = this.options.list.length; i < length; i++) {
			const element = this.options.list[i];
			const rect = element.getBoundingClientRect();
			// 计算预览图片显示宽高
			const result = this.getImgSize(element.naturalWidth, element.naturalHeight);
			let maxScale = this.decimal(element.naturalWidth / result.width, 5);
			if (maxScale < this.options.minScale) {
				maxScale = this.options.minScale;
			}
			this.data.previewList[i] = {};
			const item = this.data.previewList[i];
			item.x = this.decimal((this.data.windowWidth - result.width) / 2, 2);
			item.y = this.decimal((this.data.windowHeight - result.height) / 2, 2);
			item.width = this.decimal(result.width, 2);
			item.height = this.decimal(result.height, 2);
			item.maxWidth = this.decimal(result.width * maxScale, 2);
			item.maxHeight = this.decimal(result.height * maxScale, 2);
			item.maxScale = maxScale;
			item.thumbnail = {};
			item.thumbnail.x = this.decimal(rect.left, 2);
			item.thumbnail.y = this.decimal(rect.top, 2);
			item.thumbnail.width = this.decimal(rect.width, 2);
			item.thumbnail.height = this.decimal(rect.height, 2);
			item.thumbnail.scale = this.decimal(rect.width / result.width, 5);
		}
	},
	/**
	 * 设置当前图片坐标和缩放值
	 * @param {number} x 横坐标
	 * @param {number} y 纵坐标
	 * @param {number} width 宽度
	 * @param {number} height 高度
	 * @param {number} scale 缩放值
	 * @param {string} status 状态 shrink verticalToClose inertia
	 */
	setCurrentImg: function (x, y, width, height, scale, status) {
		this.data.currentImg = {
			x: x,
			y: y,
			width: width,
			height: height,
			scale: scale,
			status: status
		};
	},
	/**
	 * 设置wrap宽度和偏移量
	 */
	setWrap: function () {
		this.data.wrapWidth = this.data.previewList.length * this.data.windowWidth;
		this.data.wrapTranslateX = this.data.index * this.data.windowWidth * -1;
	},
	/**
	 * 渲染
	 */
	render: function () {
		let cssText = 'opacity: 0;';
		if (this.options.useTransition) {
			cssText += ' transition: opacity ' + this.options.duration + 'ms;'
		}
		let html = '<div class="noname-gallery-container">'
			+ '<div class="noname-gallery-bg" style="' + cssText + '"></div>'
			+ '<div class="noname-gallery-counter">' + (this.options.index + 1) + ' / ' + this.options.list.length + '</div>'
			+ '<ul class="noname-gallery-wrap" style="width: ' + this.data.wrapWidth
			+ 'px; transform: translate3d(' + this.data.wrapTranslateX + 'px, 0, 0)">';
		for (let i = 0, length = this.options.list.length; i < length; i++) {
			// 预览图片列表项
			const item = this.data.previewList[i];
			cssText = '';
			if (this.options.useTransition) {
				cssText = 'width: ' + item.width + 'px; height: ' + item.height + 'px;';
				if (this.data.index === i) {
					cssText += 'transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scale + ');';
					if (this.options.fadeInOut) {
						cssText += ' opacity: 0;';
					}
				} else {
					cssText += 'transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1);';
				}
				cssText += ' transition: transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms;';
			} else {
				if (this.data.index === i) {
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
		for (let i = 0, length = this.imgList.length; i < length; i++) {
			this.data.previewList[i].element = this.imgList[i];
		}
	},
	/**
	 * 打开画廊
	 */
	open: function () {
		// 当前预览图片
		const item = this.data.previewList[this.data.index];
		// 如果使用过渡实现动画
		if (this.options.useTransition) {
			// 强制重绘，否则合并计算样式，导致无法触发过渡效果，或使用setTimeout，个人猜测最短时长等于，1000 / 60 = 16.66666 ≈ 17
			window.getComputedStyle(item.element).opacity;
			this.bg.style.opacity = '1';
			if (this.options.fadeInOut) {
				item.element.style.opacity = '1';
			}
			item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
		} else {
			const obj = {
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
				index: this.data.index
			}
			if (this.options.fadeInOut) {
				obj.img.opacity = { from: 0, to: 1 };
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
			if (this.options.fadeInOut) {
				item.element.style.opacity = '0';
			}
			item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
			item.element.style.transform = 'translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scale + ')';
			this.bg.style.opacity = '0';
		} else {
			const obj = {
				bg: {
					opacity: { from: this.data.bgOpacity, to: 0 }
				},
				img: {
					width: { from: this.data.currentImg.width, to: item.thumbnail.width },
					height: { from: this.data.currentImg.height, to: item.thumbnail.height },
					x: { from: this.data.currentImg.x, to: item.thumbnail.x },
					y: { from: this.data.currentImg.y, to: item.thumbnail.y },
				},
				type: 'bgAndImg',
				index: this.data.index
			}
			if (this.options.fadeInOut) {
				obj.img.opacity = { from: 1, to: 0 };
			}
			this.raf(obj);
		}
		// 移除事件
		this.unbindEventListener();
		// 移除dom
		setTimeout(() => {
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
	},
	/**
	 * 移除事件
	 */
	unbindEventListener: function () {
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
	},
	/**
	 * 处理mousedown
	 * @param {MouseEvent} e
	 */
	handleMousedown: function (e) {
		// console.log(e.type);
		// e.button 0 = 左键 1 = 滚轮 2 = 右键
		if (e.button === 0) {
			// window.cancelAnimationFrame(this.data.radId);
			this.data.isDown = true;
			this.data.start = { x: e.clientX, y: e.clientY };
			this.data.lastMove = { x: e.clientX, y: e.clientY };
			this.data.distance = { x: 0, y: 0 };
			this.data.lastDistance = { x: 0, y: 0 };
			this.data.clickCount = 1;
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
		if (this.data.isDown) {
			this.handleMove(e);
		}
		e.preventDefault();
	},
	/**
	 * 处理mouseup
	 * @param {MouseEvent} e
	 */
	handleMouseup: function (e) {
		// console.log(e.type);
		if (this.data.isDown) {
			this.data.isDown = false;
			if (this.data.dragTarget === 'wrap') {
				this.handleWrapMoveEnd();
			} else if (this.data.dragTarget === 'img') {
				this.handleImgMoveEnd();
			}
			// 响应单击事件
			if (this.data.clickCount !== 0) {
				// 图片放大/缩小
				if (e.target.className === 'noname-gallery-img') {
					this.handleZoom({ x: e.clientX, y: e.clientY });
				} else {
					// 关闭画廊
					this.close();
				}
			}
		}
	},
	/**
	 * 处理touchstart
	 * @param {TouchEvent} e
	 */
	handleTouchstart: function (e) {
		// console.log(e.type);
		this.data.isDown = true;
		this.data.start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		this.data.lastMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		// window.cancelAnimationFrame(this.data.rafId);
		if (e.touches.length === 1) {
			this.data.distance = { x: 0, y: 0 };
			this.data.lastDistance = { x: 0, y: 0 };
			this.data.direction = '';
			this.data.dragTarget = '';
			this.data.startTime = Date.now();
			clearTimeout(this.data.singleClickTimer);
			this.data.clickCount++;
		} else if (e.touches.length === 2) {
			this.data.start2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
			this.data.clickCount = 0;
			this.data.lastDistanceRatio = 1;
			this.data.lastCenter = null;
		}
		e.preventDefault();
	},
	/**
	 * 处理touchmove
	 * @param {TouchEvent} e
	 */
	handleTouchmove: function (e) {
		// console.log(e.type);
		if (this.data.isDown) {
			if (e.touches.length === 1) {
				// 如果图片被双指缩小则不响应拖动事件
				if (this.data.currentImg.status !== 'shrink') {
					this.handleMove(e);
				}
			} else if (e.touches.length === 2) {
				// 如果dragTarget = 'wrap' 或者垂直滑动关闭时，不响应双指缩放事件
				if (this.data.dragTarget !== 'wrap' && this.data.currentImg.status !== 'verticalToClose') {
					if (this.data.dragTarget === '') this.data.dragTarget = 'img';
					this.handlePinch(e);
				}
			}
		}
		e.preventDefault();
	},
	/**
	 * 处理touchend
	 * @param {TouchEvent} e
	 */
	handleTouchend: function (e) {
		// console.log(e.type);
		if (this.data.isDown) {
			if (e.touches.length === 0) {
				this.data.isDown = false;
				// 处理移动结束
				if (this.data.dragTarget === 'wrap') {
					this.handleWrapMoveEnd();
				} else if (this.data.dragTarget === 'img') {
					this.handleImgMoveEnd();
				}
				// 响应单击、双击事件
				const now = Date.now();
				if (this.data.clickCount > 1) {
					// 双击放大
					this.data.clickCount = 0;
					this.handleZoom(this.data.start);
				} else if (now - this.data.startTime < 300) {
					if (this.data.clickCount === 1) {
						this.data.singleClickTimer = setTimeout(() => {
							// 单击关闭
							this.data.clickCount = 0;
							this.close();
						}, 300);
					}
				} else {
					this.data.clickCount = 0;
				}
			} else if (e.touches.length === 1) {
				this.data.start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
				this.data.lastMove = { x: e.touches[0].clientX, y: e.touches[0].clientY };
				this.data.lastDistance = { x: this.data.distance.x, y: this.data.distance.y };
			}
		}
	},
	/**
	 * 处理touchcancel
	 */
	handleTouchcancel: function () {
		// console.log(e.type);
		// 微信浏览器长按呼出菜单
		this.data.clickCount = 0;
	},
	/**
	 * 窗口大小变化旋转时触发
	 */
	handleResize: function () {
		this.setWindowSize();
		this.setPreviewList();
		const item = this.data.previewList[this.data.index];
		this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		this.setWrap();
		for (let i = 0, length = this.imgList.length; i < length; i++) {
			const item = this.data.previewList[i];
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
		this.wrap.style.width = this.data.wrapWidth + 'px';
		this.wrap.style.transform = 'translate3d(' + this.data.wrapTranslateX + 'px, 0, 0)';
		if (this.options.useTransition) {
			this.wrap.style.transition = 'none';
		}
		this.data.clickCount = 0;
	},
	/**
	 * esc退出
	 * @param {*} e 
	 */
	handleKeydown: function (e) {
		if (this.options.openKeyboard) {
			if (e.keyCode === 27) {
				this.close();
			} else if ([37, 38].includes(e.keyCode)) {
				this.handleSwitch('prev');
			} else if ([39, 40].includes(e.keyCode)) {
				this.handleSwitch('next');
			}
			// console.log(e.keyCode)
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
		// 恢复
		if (this.data.currentImg.width > item.width || this.data.currentImg.height > item.height) {
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
			} else {
				const obj = {
					img: {
						width: { from: this.data.currentImg.width, to: item.width },
						height: { from: this.data.currentImg.height, to: item.height },
						x: { from: this.data.currentImg.x, to: item.x },
						y: { from: this.data.currentImg.y, to: item.y }
					},
					type: 'img',
					index: this.data.index
				}
				this.raf(obj);
			}
			item.element.style.cursor = 'zoom-in';
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		} else { // 放大
			let ix, iy, x, y;
			const halfWindowWidth = this.data.windowWidth / 2;
			const halfWindowHeight = this.data.windowHeight / 2;
			// 根据点击位置求放大图片后的位置
			// 如果点击位置的横坐标=100 图片距离左边的距离=20  相对图片的横坐标=80（100-20） 相对放大图片的横坐标=80*item.maxScale
			ix = this.decimal((point.x - item.x) * item.maxScale, 2);
			iy = this.decimal((point.y - item.y) * item.maxScale, 2);
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
				x = (this.data.windowWidth - item.maxWidth) / 2;
			}
			x = this.decimal(x, 2);
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
				y = (this.data.windowHeight - item.maxHeight) / 2;
			}
			y = this.decimal(y, 2);
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + x + 'px,' + y + 'px, 0) scale(' + item.maxScale + ')';
			} else {
				const obj = {
					img: {
						width: { from: item.width, to: item.maxWidth },
						height: { from: item.height, to: item.maxHeight },
						x: { from: item.x, to: x },
						y: { from: item.y, to: y }
					},
					type: 'img',
					index: this.data.index
				}
				this.raf(obj);
			}
			item.element.style.cursor = 'zoom-out';
			this.setCurrentImg(x, y, item.maxWidth, item.maxHeight, item.maxScale, '');
		}
	},
	/**
	 * 鼠标或单指移动
	 */
	handleMove: function (e) {
		const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
		const y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
		this.data.step = { x: x - this.data.lastMove.x, y: y - this.data.lastMove.y };
		this.data.distance.x = x - this.data.start.x + this.data.lastDistance.x;
		this.data.distance.y = y - this.data.start.y + this.data.lastDistance.y;
		this.data.lastMove = { x: x, y: y };
		this.data.lastMoveTime = Date.now();
		if (Math.abs(this.data.distance.x) > 10 || Math.abs(this.data.distance.y) > 10) {
			this.data.clickCount = 0;
			// 获取移动方向
			this.getDirection();
			// 获取移动目标
			this.getDragTarget();
			// 处理移动中
			if (this.data.dragTarget === 'wrap') {
				this.handleWrapMove();
			} else if (this.data.dragTarget === 'img') {
				this.handleImgMove();
			}
		}
	},
	/**
	 * 双指缩放、移动
	 */
	handlePinch: function (e) {
		const MIN_SCALE = 0.7;
		const item = this.data.previewList[this.data.index];
		const touche = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		const touche2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
		let end = this.getDistance(touche, touche2);
		let start = this.getDistance(this.data.start, this.data.start2);
		const distanceRatio = end / start;
		var ratio = distanceRatio / this.data.lastDistanceRatio;

		this.data.currentImg.scale *= ratio;
		this.data.currentImg.width *= ratio;
		this.data.currentImg.height *= ratio;
		if (this.data.currentImg.scale > item.maxScale) {
			this.data.currentImg.scale = item.maxScale;
			ratio = 1;
		} else if (this.data.currentImg.scale < MIN_SCALE) {
			this.data.currentImg.scale = MIN_SCALE;
			ratio = 1;
		}
		if (this.data.currentImg.scale < 1) {
			this.data.currentImg.status = 'shrink';
		} else {
			this.data.currentImg.status = '';
		}
		if (this.data.currentImg.width > item.maxWidth) {
			this.data.currentImg.width = item.maxWidth;
		} else if (this.data.currentImg.width < item.width * MIN_SCALE) {
			this.data.currentImg.width = this.decimal(item.width * MIN_SCALE, 2);
		}
		if (this.data.currentImg.height > item.maxHeight) {
			this.data.currentImg.height = item.maxHeight;
		} else if (this.data.currentImg.height < item.height * MIN_SCALE) {
			this.data.currentImg.height = this.decimal(item.height * MIN_SCALE, 2);
		}
		this.data.lastDistanceRatio = distanceRatio;

		const center = this.getCenter(touche, touche2);
		this.data.currentImg.x = this.data.currentImg.x - (ratio - 1) * (center.x - this.data.currentImg.x);
		this.data.currentImg.y = this.data.currentImg.y - (ratio - 1) * (center.y - this.data.currentImg.y);
		if (this.data.lastCenter) {
			this.data.currentImg.x = this.data.currentImg.x + center.x - this.data.lastCenter.x;
			this.data.currentImg.y = this.data.currentImg.y + center.y - this.data.lastCenter.y;
		}
		this.data.lastCenter = center;
		// 处理边界
		this.handleBoundary();
		if (this.options.useTransition) {
			item.element.style.transition = 'none';
			item.element.style.transform = 'translate3d(' + this.data.currentImg.x + 'px, ' + this.data.currentImg.y + 'px, 0) scale(' + this.data.currentImg.scale + ')';
		} else {
			item.element.style.width = this.data.currentImg.width + 'px';
			item.element.style.height = this.data.currentImg.height + 'px';
			item.element.style.transform = 'translate3d(' + this.data.currentImg.x + 'px, ' + this.data.currentImg.y + 'px, 0)';
		}
	},
	/**
	 * 处理边界
	 */
	handleBoundary: function () {
		if (this.data.currentImg.width > this.data.windowWidth) {
			if (this.data.currentImg.x > 0) {
				this.data.currentImg.x = 0
			} else if (this.data.currentImg.x < this.data.windowWidth - this.data.currentImg.width) {
				this.data.currentImg.x = this.data.windowWidth - this.data.currentImg.width;
			}
		} else {
			this.data.currentImg.x = (this.data.windowWidth - this.data.currentImg.width) / 2;
		}
		if (this.data.currentImg.height > this.data.windowHeight) {
			if (this.data.currentImg.y > 0) {
				this.data.currentImg.y = 0
			} else if (this.data.currentImg.y < this.data.windowHeight - this.data.currentImg.height) {
				this.data.currentImg.y = this.data.windowHeight - this.data.currentImg.height;
			}
		} else {
			this.data.currentImg.y = (this.data.windowHeight - this.data.currentImg.height) / 2;
		}
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
			if (Math.abs(this.data.distance.x) > Math.abs(this.data.distance.y)) {
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
			let flag = false, flag2 = false;
			// 图片宽度大于屏幕宽度且滑动到边界
			if (this.data.currentImg.width > this.data.windowWidth) {
				if (
					(this.data.step.x > 0 && this.data.currentImg.x === 0) ||
					(this.data.step.x < 0 && this.data.currentImg.x === this.data.windowWidth - this.data.currentImg.width)
				) {
					flag = true;
				}
			} else {
				// 图片宽度小于屏幕宽度，但未被双指缩小
				if (this.data.currentImg.width >= this.data.previewList[this.data.index].width) {
					flag2 = true;
				}
			}
			if (this.data.direction === 'h' && (flag || flag2)) {
				this.data.dragTarget = 'wrap';
			} else {
				this.data.dragTarget = 'img';
			}
			// console.log(this.data.dragTarget);
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
		if (this.options.useTransition) {
			this.wrap.style.transition = 'none';
		}
		this.wrap.style.transform = 'translate3d(' + this.data.wrapTranslateX + 'px, 0, 0)';
	},
	/**
	 * 处理img移动
	 */
	handleImgMove: function () {
		const item = this.data.previewList[this.data.index];
		// 如果图片是放大状态
		if (this.data.currentImg.width > this.data.windowWidth || this.data.currentImg.height > this.data.windowHeight) {
			this.data.currentImg.x += this.data.step.x;
			this.data.currentImg.y += this.data.step.y;
			this.handleBoundary();
			this.data.currentImg.status = 'inertia';
			if (this.options.useTransition) {
				item.element.style.transition = 'none';
				item.element.style.transform = 'translate3d(' + this.data.currentImg.x + 'px, ' + this.data.currentImg.y + 'px, 0) scale(' + this.data.currentImg.scale + ')';
			} else {
				item.element.style.transform = 'translate3d(' + this.data.currentImg.x + 'px, ' + this.data.currentImg.y + 'px, 0)';
			}
		} else {
			if (this.data.direction === 'v' && this.data.currentImg.width <= item.width && this.data.currentImg.height <= item.height) {
				this.data.currentImg.status = 'verticalToClose';
				this.data.bgOpacity = this.decimal(1 - Math.abs(this.data.distance.y) / (this.data.windowHeight / 1.2), 5);
				if (this.data.bgOpacity < 0) {
					this.data.bgOpacity = 0;
				}
				if (this.options.verticalZoom) {
					this.data.currentImg.scale = this.data.bgOpacity;
					this.data.currentImg.width = this.decimal(item.width * this.data.currentImg.scale, 2);
					this.data.currentImg.height = this.decimal(item.height * this.data.currentImg.scale, 2);
					this.data.currentImg.x = item.x + this.data.distance.x + (item.width - this.data.currentImg.width) / 2;
					this.data.currentImg.y = item.y + this.data.distance.y + (item.height - this.data.currentImg.height) / 2;
				} else {
					this.data.currentImg.x = item.x;
					this.data.currentImg.y = item.y + this.data.distance.y;
					this.data.currentImg.scale = 1;
				}
				this.bg.style.opacity = this.data.bgOpacity;
				if (this.options.useTransition) {
					this.bg.style.transition = 'none';
					item.element.style.transition = 'none';
					item.element.style.transform = 'translate3d(' + this.data.currentImg.x + 'px, ' + this.data.currentImg.y + 'px , 0) scale(' + this.data.currentImg.scale + ')';
				} else {
					item.element.style.width = this.data.currentImg.width + 'px';
					item.element.style.height = this.data.currentImg.height + 'px';
					item.element.style.transform = 'translate3d(' + this.data.currentImg.x + 'px, ' + this.data.currentImg.y + 'px , 0)';
				}
			}
		}
	},
	/**
	 * wrap移动结束
	 */
	handleWrapMoveEnd: function () {
		const MIN_SWIPE_DISTANCE = Math.round(this.data.windowWidth * 0.15);
		const lastIndex = this.data.index;
		const lastItem = this.data.previewList[lastIndex];
		const lastImg = {
			width: this.data.currentImg.width,
			height: this.data.currentImg.height,
			x: this.data.currentImg.x,
			y: this.data.currentImg.y,
			scale: this.data.currentImg.scale,
			status: this.data.currentImg.status
		};
		if (Math.abs(this.data.distance.x) > MIN_SWIPE_DISTANCE) {
			if (this.data.distance.x > 0) {
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
				if (lastImg.width > lastItem.width || lastImg.height > lastItem.height) {
					if (this.options.useTransition) {
						lastItem.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
						lastItem.element.style.transform = 'translate3d(' + lastItem.x + 'px, ' + lastItem.y + 'px, 0) scale(1)';
					} else {
						const obj = {
							img: {
								width: { from: lastImg.width, to: lastItem.width },
								height: { from: lastImg.height, to: lastItem.height },
								x: { from: lastImg.x, to: lastItem.x },
								y: { from: lastImg.y, to: lastItem.y }
							},
							type: 'img',
							index: lastIndex
						}
						this.raf(obj);
					}
					lastItem.element.style.cursor = 'zoom-in';
				}
				const item = this.data.previewList[this.data.index];
				this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
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
		if (this.data.currentImg.status === 'inertia' && Date.now() - this.data.lastMoveTime < 100) {
			this.handleInertia();
		} else if (this.data.currentImg.status === 'verticalToClose' && Math.abs(this.data.distance.y) >= MIN_CLOSE_DISTANCE) {
			this.close();
			this.data.bgOpacity = 1;
		} else if (this.data.currentImg.status === 'shrink' || (this.data.currentImg.status == 'verticalToClose' && Math.abs(this.data.distance.y) < MIN_CLOSE_DISTANCE)) {
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
				this.bg.style.opacity = '1';
			} else {
				const obj = {
					bg: {
						opacity: { from: this.data.bgOpacity, to: 1 }
					},
					img: {
						width: { from: this.data.currentImg.width, to: item.width },
						height: { from: this.data.currentImg.height, to: item.height },
						x: { from: this.data.currentImg.x, to: item.x },
						y: { from: this.data.currentImg.y, to: item.y }
					},
					type: 'bgAndImg',
					index: this.data.index
				}
				this.raf(obj);
			}
			this.data.bgOpacity = 1;
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		}
	},
	/**
	 * 处理惯性滚动
	 */
	handleInertia: function () {
		const item = this.data.previewList[this.data.index];
		const x = this.data.currentImg.x;
		const y = this.data.currentImg.y;
		this.data.currentImg.x += this.data.step.x * 18;
		this.data.currentImg.y += this.data.step.y * 18;
		this.handleBoundary();
		if (this.options.useTransition) {
			item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out';
			item.element.style.transform = 'translate3d(' + this.data.currentImg.x + 'px, ' + this.data.currentImg.y + 'px, 0) scale(' + this.data.currentImg.scale + ')';
		} else {
			const obj = {
				img: {
					opacity: { from: 1, to: 1 },
					width: { from: this.data.currentImg.width, to: this.data.currentImg.width },
					height: { from: this.data.currentImg.height, to: this.data.currentImg.height },
					x: { from: x, to: this.data.currentImg.x },
					y: { from: y, to: this.data.currentImg.y }
				},
				type: 'img',
				index: this.data.index
			}
			this.raf(obj);
		}
	},
	/**
	 * 方向键切换图片
	 * @param {string} type 
	 */
	handleSwitch: function (type) {
		let isChange = false;
		if (type === 'prev') {
			if (this.data.index > 0) {
				this.data.index--;
				isChange = true;
			}
		} else {
			if (this.data.index < this.data.previewList.length - 1) {
				this.data.index++;
				isChange = true;
			}
		}
		if (isChange) {
			let x = this.data.windowWidth * this.data.index * -1;
			if (this.options.useTransition) {
				this.wrap.style.transition = 'transform ' + this.options.duration + 'ms';
				this.wrap.style.transform = 'translate3d(' + x + 'px, 0, 0)';
			} else {
				const obj = {
					wrap: {
						x: {
							from: this.data.wrapTranslateX,
							to: x
						}
					},
					type: 'wrap'
				}
				this.raf(obj);
			}
			this.data.wrapTranslateX = x;
			this.counter.innerHTML = (this.data.index + 1) + ' / ' + this.data.previewList.length;
			const item = this.data.previewList[this.data.index];
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
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
		let duration = this.options.duration;
		function step(timestamp) {
			if (start === undefined) {
				start = timestamp;
			}
			let time = timestamp - start;
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
				self.data.rafId = window.requestAnimationFrame(step);
			}
		}
		this.data.rafId = window.requestAnimationFrame(step);
	},
	/**
	 * bg opacity动画
	 * @param {object} obj 
	 * @param {number} time 动画当前时间
	 * @param {number} duration 动画持续时间
	 */
	bgAnimate: function (obj, time, duration) {
		let opacity = this.decimal(this.easeOut(obj.bg.opacity.from, obj.bg.opacity.to, time, duration), 5);
		this.bg.style.opacity = opacity;
	},
	/**
	 * img zoom动画
	 * @param {object} obj
	 * @param {number} time 动画当前时间
	 * @param {number} duration 动画持续时间
	 */
	imgAnimate: function (obj, time, duration) {
		const item = this.data.previewList[obj.index];
		let width = this.decimal(this.easeOut(obj.img.width.from, obj.img.width.to, time, duration), 2);
		let height = this.decimal(this.easeOut(obj.img.height.from, obj.img.height.to, time, duration), 2);
		let x = this.decimal(this.easeOut(obj.img.x.from, obj.img.x.to, time, duration), 2);
		let y = this.decimal(this.easeOut(obj.img.y.from, obj.img.y.to, time, duration), 2);
		if (obj.img.opacity) {
			let opacity = this.decimal(this.easeOut(obj.img.opacity.from, obj.img.opacity.to, time, duration), 5);
			item.element.style.opacity = opacity;
		}
		item.element.style.width = width + 'px';
		item.element.style.height = height + 'px';
		item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
	},
	/**
	 * wrap滑动动画
	 * @param {object} obj
	 * @param {number} time 动画当前时间
	 * @param {number} duration 动画持续时间
	 */
	wrapAnimate: function (obj, time, duration) {
		let x = this.decimal(this.easeOut(obj.wrap.x.from, obj.wrap.x.to, time, duration), 2);
		this.wrap.style.transform = 'translate3d(' + x + 'px, 0, 0)';
	}
}