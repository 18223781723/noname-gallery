; (function () {
	'use strict';
	/**
	 * 使用PointerEvent实现的图片预览插件
	 * @param {object} options 配置项
	 */
	function NonameGallery(options) {
		// 抛出错误
		if (options.list.length === 0) {
			throw new Error('options.list can not be empty array');
		}
		this.options = Object.assign({}, this.defaults, options);
	}
	/**
	 * 默认配置项
	 */
	NonameGallery.prototype.defaults = {
		list: [], // HTMLImageElement[]
		index: 0, // 索引
		fadeInOut: true, // 淡入淡出
		useTransform: true, // 宽高缩放只能使用requestAnimationFrame，transition同时过渡宽高和transform时会发生抖动以及动画轨迹偏移的问题，手机端微信浏览器尤其严重
		verticalZoom: true, // 垂直滑动缩放图片
		openKeyboard: false, // 开启键盘 esc关闭，方向键切换图片
		zoomToScreenCenter: false, // 将放大区域移动到屏幕中心显示
		duration: 300, // 动画持续时间
		minScale: 1.5 // 最小放大倍数
	}
	/**
	 * 初始化
	 */
	NonameGallery.prototype.init = function () {
		// 设置属性值
		this.setProperties();
		// 设置视口大小
		this.setWindowSize();
		// 设置previewList
		this.setPreviewList();
		// 设置wrap宽度和x轴偏移量
		this.setWrap();
		// 渲染
		this.render();
		// 获取元素
		this.getElement();
		// 绑定事件
		this.bindEventListener();
		// 打开画廊
		this.open();
	}
	/**
	 * 设置属性值（防止全局实例，多次调用出现问题）
	 */
	NonameGallery.prototype.setProperties = function () {
		this.container = null; // .noname-gallery-container
		this.bg = null; // .noname-gallery-bg
		this.counter = null; // .noname-gallery-counter
		this.wrap = null; // .noname-gallery-wrap
		this.imgList = null; // .noname-gallery-img
		this.bgOpacity = 1; // .noname-gallery-bg 透明度
		this.windowWidth = 0; // 视口宽度
		this.windowHeight = 0; // 视口高度
		this.index = this.options.index; // 预览图片索引
		this.wrapWidth = 0; // .noname-gallery-wrap 宽度
		this.wrapX = 0; // .noname-gallery-wrap x轴偏移量
		this.previewList = []; // 预览图片列表
		this.currentImg = {
			x: 0, // 当前图片旋转中心(已设置为左上角)相对屏幕左上角偏移值
			y: 0, // 当前图片旋转中心(已设置为左上角)相对屏幕左上角偏移值
			width: 0, // 当前图片宽度
			height: 0, // 当前图片高度
			scale: 1, // 当前图片缩放倍数
			opacity: 1, // 当前图片透明度 开启淡入淡出时会使用到
			status: '' // 当前图片状态 shrink(scale < 1) verticalToClose inertia
		};
		this.pointers = []; // 指针数组用于保存多个触摸点
		this.point1 = { x: 0, y: 0 }; // 第一个触摸点
		this.point2 = { x: 0, y: 0 }; // 第二个触摸点
		this.diff = { x: 0, y: 0 }; // 相对于上一次移动差值
		this.distance = { x: 0, y: 0 }; // 移动距离
		this.lastDistance = { x: 0, y: 0 }; // 双指滑动时记录上一次移动距离
		this.lastPoint1 = { x: 0, y: 0 }; // 上一次第一个触摸点位置，用于判断双击距离是否大于30
		this.lastPoint2 = { x: 0, y: 0 }; // 上一次第二个触摸点位置
		this.lastMove = { x: 0, y: 0 }; // 上一次移动坐标
		this.lastCenter = { x: 0, y: 0 }; // 上一次双指中心位置
		this.tapCount = 0; // 点击次数 1 = 单击 大于1 = 双击
		this.dragDirection = ''; // 拖拽方向 v(vertical) h(horizontal)
		this.dragTarget = ''; // 拖拽目标 wrap img
		this.status = ''; // close 时移除dom
		this.isPointerdown = false; // 按下标识
		this.isAnimating = true; // 是否正在执行动画
		this.isWrapAnimating = false; // 是否正在执行wrap切换动画，不响应键盘事件
		this.tapTimeout = null; // 单击延时器 250ms 判断双击
		this.pointerdownTime = null; // pointerdown time
		this.pointermoveTime = null; // 鼠标松开距离最后一次移动小于200ms执行惯性滑动
		this.pinchTime = null; // 距离上一次双指缩放的时间
		this.inertiaRafId = null; // requestAnimationFrame id 用于停止惯性滑动动画
		this.wrapRafId = null; // requestAnimationFrame id 用于停止wrap滑动动画
	}
	/**
	 * 设置视口大小
	 */
	NonameGallery.prototype.setWindowSize = function () {
		this.windowWidth = window.innerWidth;
		this.windowHeight = window.innerHeight;
	}
	/**
	 * 设置previewList
	 */
	NonameGallery.prototype.setPreviewList = function () {
		for (const img of this.options.list) {
			const rect = img.getBoundingClientRect();
			const result = this.getImgSize(img.naturalWidth, img.naturalHeight, this.windowWidth, this.windowHeight);
			const maxScale = Math.max(this.decimal(img.naturalWidth / result.width, 5), this.options.minScale);
			this.previewList.push({
				x: this.decimal((this.windowWidth - result.width) / 2, 2), // 预览图片左上角相对于视口的横坐标
				y: this.decimal((this.windowHeight - result.height) / 2, 2), // 预览图片左上角相对于视口的纵坐标
				width: this.decimal(result.width, 2), // 预览图片显示宽度
				height: this.decimal(result.height, 2), // 预览图片显示高度
				maxWidth: this.decimal(result.width * maxScale, 2), // 预览图片最大宽度
				maxHeight: this.decimal(result.height * maxScale, 2), // 预览图片最大高度
				maxScale: maxScale, // 预览图片最大缩放比例
				thumbnail: {
					x: this.decimal(rect.left, 2), // 缩略图左上角相对于视口的横坐标
					y: this.decimal(rect.top, 2), // 缩略图左上角相对于视口的纵坐标
					width: this.decimal(rect.width, 2), // 缩略图显示宽度
					height: this.decimal(rect.height, 2), // 缩略图显示高度
					scaleX: this.decimal(rect.width / result.width, 5), // 缩略图x轴比例
					scaleY: this.decimal(rect.height / result.height, 5) // 缩略图y轴比例
				}
			});
		}
	}
	/**
	 * 设置当前图片数据
	 * @param {number} x 横坐标
	 * @param {number} y 纵坐标
	 * @param {number} width 宽度
	 * @param {number} height 高度
	 * @param {number} scale 缩放值
	 * @param {number} opacity 透明度
	 * @param {string} status 状态 shrink verticalToClose inertia
	 */
	NonameGallery.prototype.setCurrentImg = function (x, y, width, height, scale, opacity, status) {
		this.currentImg = {
			x: x,
			y: y,
			width: width,
			height: height,
			scale: scale,
			opacity: opacity,
			status: status
		};
	}
	/**
	 * 设置wrap宽度和x轴偏移量
	 */
	NonameGallery.prototype.setWrap = function () {
		this.wrapWidth = this.previewList.length * this.windowWidth;
		this.wrapX = this.index * this.windowWidth * -1;
	}
	/**
	 * 渲染
	 */
	NonameGallery.prototype.render = function () {
		// bg背景透明度过渡效果
		let cssText = 'opacity: 0;';
		if (this.options.useTransform) {
			cssText += 'transition: opacity ' + this.options.duration + 'ms ease-out;';
		}
		let html = '<div class="noname-gallery-container">'
			+ '<div class="noname-gallery-bg" style="' + cssText + '"></div>'
			+ '<div class="noname-gallery-counter">' + (this.options.index + 1) + ' / ' + this.options.list.length + '</div>'
			+ '<ul class="noname-gallery-wrap" style="width: ' + this.wrapWidth + 'px; transform: translate3d(' + this.wrapX + 'px, 0, 0)">';
		for (let i = 0, length = this.options.list.length; i < length; i++) {
			const item = this.previewList[i];
			if (this.options.useTransform) {
				cssText = 'width: ' + item.width + 'px; height: ' + item.height + 'px;';
				if (this.index === i) {
					cssText += 'transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scaleX + ', ' + item.thumbnail.scaleY + ');';
				} else {
					cssText += 'transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1);';
				}
				cssText += 'transition: transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out;';
			} else {
				if (this.index === i) {
					cssText = 'width: ' + item.thumbnail.width + 'px; height: ' + item.thumbnail.height + 'px;';
					cssText += 'transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0);';
				} else {
					cssText = 'width: ' + item.width + 'px; height: ' + item.height + 'px;';
					cssText += 'transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0);';
				}
			}
			if (this.index === i && this.options.fadeInOut) {
				cssText += 'opacity: 0;';
			}
			cssText += 'cursor: zoom-in;';
			html += '<li>'
				+ '<img class="noname-gallery-img" src="' + this.options.list[i].src + '" alt="" style="' + cssText + '">'
				+ '</li>';
		}
		html += '</ul></div>';
		document.body.insertAdjacentHTML('beforeend', html);
	}
	/**
	 * 获取元素
	 */
	NonameGallery.prototype.getElement = function () {
		this.container = document.querySelector('.noname-gallery-container');
		this.bg = document.querySelector('.noname-gallery-bg');
		this.counter = document.querySelector('.noname-gallery-counter');
		this.wrap = document.querySelector('.noname-gallery-wrap');
		this.imgList = document.querySelectorAll('.noname-gallery-img');
		for (let i = 0, length = this.imgList.length; i < length; i++) {
			this.previewList[i].element = this.imgList[i]; // HTMLImageElement
		}
	}
	/**
	 * 打开画廊
	 */
	NonameGallery.prototype.open = function () {
		const item = this.previewList[this.index];
		if (this.options.useTransform) {
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
					y: { from: item.thumbnail.y, to: item.y },
					index: this.index
				}
			}
			if (this.options.fadeInOut) {
				obj.img.opacity = { from: 0, to: 1 };
			}
			this.raf(obj);
		}
		// 设置当前图片数据
		this.setCurrentImg(item.x, item.y, item.width, item.height, 1, 1, '');
	}
	/**
	 * 关闭画廊
	 */
	NonameGallery.prototype.close = function () {
		this.isAnimating = true;
		this.status = 'close';
		const item = this.previewList[this.index];
		if (this.options.useTransform) {
			if (this.options.fadeInOut) {
				item.element.style.opacity = '0';
			}
			item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
			item.element.style.transform = 'translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scaleX + ', ' + item.thumbnail.scaleY + ')';
			this.bg.style.transition = 'opacity ' + this.options.duration + 'ms ease-out';
			this.bg.style.opacity = '0';
		} else {
			const obj = {
				bg: {
					opacity: { from: this.bgOpacity, to: 0 }
				},
				img: {
					width: { from: this.currentImg.width, to: item.thumbnail.width },
					height: { from: this.currentImg.height, to: item.thumbnail.height },
					x: { from: this.currentImg.x, to: item.thumbnail.x },
					y: { from: this.currentImg.y, to: item.thumbnail.y },
					index: this.index
				}
			}
			if (this.options.fadeInOut) {
				obj.img.opacity = { from: 1, to: 0 };
			}
			this.raf(obj);
		}
	}
	/**
	 * 绑定事件
	 */
	NonameGallery.prototype.bindEventListener = function () {
		this.handlePointerdown = this.handlePointerdown.bind(this);
		this.handlePointermove = this.handlePointermove.bind(this);
		this.handlePointerup = this.handlePointerup.bind(this);
		this.handlePointercancel = this.handlePointercancel.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.handleTransitionEnd = this.handleTransitionEnd.bind(this);
		this.container.addEventListener('pointerdown', this.handlePointerdown);
		this.container.addEventListener('pointermove', this.handlePointermove);
		this.container.addEventListener('pointerup', this.handlePointerup);
		this.container.addEventListener('pointercancel', this.handlePointercancel);
		this.container.addEventListener('transitionend', this.handleTransitionEnd);
		window.addEventListener('resize', this.handleResize);
		window.addEventListener('orientationchange', this.handleResize);
		if (this.options.openKeyboard) {
			this.handleKeydown = this.handleKeydown.bind(this);
			window.addEventListener('keydown', this.handleKeydown);
		}
	}
	/**
	 * 解绑事件
	 */
	NonameGallery.prototype.unbindEventListener = function () {
		this.container.removeEventListener('pointerdown', this.handlePointerdown);
		this.container.removeEventListener('pointermove', this.handlePointermove);
		this.container.removeEventListener('pointerup', this.handlePointerup);
		this.container.removeEventListener('pointercancel', this.handlePointercancel);
		this.container.removeEventListener('transitionend', this.handleTransitionEnd);
		window.removeEventListener('resize', this.handleResize);
		window.removeEventListener('orientationchange', this.handleResize);
		if (this.options.openKeyboard) {
			window.removeEventListener('keydown', this.handleKeydown);
		}
	}
	/**
	 * 处理pointerdown
	 * @param {PointerEvent} e 
	 */
	NonameGallery.prototype.handlePointerdown = function (e) {
		// 非鼠标左键点击或正在执行开始动画，缩放动画，垂直滑动、双指缩小恢复动画，结束动画
		if (e.pointerType === 'mouse' && e.button !== 0 || this.isAnimating) {
			return;
		}
		this.pointers.push(e);
		this.point1 = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
		if (this.pointers.length === 1) {
			this.container.setPointerCapture(e.pointerId);
			this.isPointerdown = true;
			this.distance = { x: 0, y: 0 };
			this.lastDistance = { x: 0, y: 0 };
			this.pointerdownTime = Date.now();
			this.pinchTime = null;
			this.lastMove = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
			if (this.isWrapAnimating === false) {
				this.tapCount++;
			}
			// 双击两点距离不超过30
			if (this.tapCount > 1 && (Math.abs(this.point1.x - this.lastPoint1.x) > 30 || Math.abs(this.point1.y - this.lastPoint1.y) > 30)) {
				this.tapCount = 1;
			}
			clearTimeout(this.tapTimeout);
			window.cancelAnimationFrame(this.inertiaRafId);
			window.cancelAnimationFrame(this.wrapRafId);
		} else if (this.pointers.length === 2) {
			this.tapCount = 0;
			this.point2 = { x: this.pointers[1].clientX, y: this.pointers[1].clientY };
			this.lastCenter = this.getCenter(this.point1, this.point2);
			this.lastDistance = { x: this.distance.x, y: this.distance.y };
			this.lastPoint2 = { x: this.pointers[1].clientX, y: this.pointers[1].clientY };
			if (this.dragTarget === '') {
				this.dragTarget = 'img';
			}
		}
		this.lastPoint1 = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
	}
	/**
	 * 处理pointermove
	 * @param {PointerEvent} e
	 */
	NonameGallery.prototype.handlePointermove = function (e) {
		if (!this.isPointerdown) {
			return;
		}
		this.handlePointers(e, 'update');
		const current1 = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
		if (this.pointers.length === 1) {
			this.diff = { x: current1.x - this.lastMove.x, y: current1.y - this.lastMove.y };
			this.distance = { x: current1.x - this.point1.x + this.lastDistance.x, y: current1.y - this.point1.y + this.lastDistance.y };
			this.lastMove = { x: current1.x, y: current1.y };
			this.pointermoveTime = Date.now();
			if (Math.abs(this.distance.x) > 10 || Math.abs(this.distance.y) > 10) {
				this.tapCount = 0;
				// 偏移量大于10才判断dragDirection和dragTarget
				if (this.dragDirection === '' && this.dragTarget === '') {
					this.getDragDirection();
					this.getDragTarget();
				}
			}
			if (this.dragTarget === 'wrap') {
				this.handleWrapPointermove();
			} else if (this.dragTarget === 'img') {
				this.handleImgPointermove();
			}
		} else if (this.pointers.length === 2) {
			const current2 = { x: this.pointers[1].clientX, y: this.pointers[1].clientY };
			if (this.dragTarget === 'img' && this.currentImg.status !== 'verticalToClose') {
				this.handlePinch(current1, current2);
			}
			this.lastPoint1 = { x: current1.x, y: current1.y };
			this.lastPoint2 = { x: current2.x, y: current2.y };
		}
		// 阻止默认事件，例如拖拽图片
		e.preventDefault();
	}
	/**
	 * 处理pointerup
	 * @param {PointerEvent} e
	 */
	NonameGallery.prototype.handlePointerup = function (e) {
		if (!this.isPointerdown) {
			return;
		}
		this.handlePointers(e, 'delete');
		if (this.pointers.length === 0) {
			this.isPointerdown = false;
			if (this.tapCount === 0) {
				if (this.dragTarget === 'wrap') {
					this.handleWrapPointerup();
				} else if (this.dragTarget === 'img') {
					this.handleImgPointerup();
				}
			} else if (this.tapCount === 1) {
				if (e.pointerType === 'mouse') {
					// 由于调用过setPointerCapture方法，导致无法使用e.target来判断触发事件的元素，所以只能根据点击位置来判断
					if (e.clientX >= this.currentImg.x && e.clientX <= this.currentImg.x + this.currentImg.width &&
						e.clientY >= this.currentImg.y && e.clientY <= this.currentImg.y + this.currentImg.height) {
						this.handleZoom({ x: e.clientX, y: e.clientY });
					} else {
						this.close();
					}
				} else {
					// 触发移动端长按保存图片后不关闭画廊
					if (Date.now() - this.pointerdownTime < 500) {
						this.tapTimeout = setTimeout(() => {
							this.close();
						}, 250);
					} else {
						this.tapCount = 0;
					}
				}
			} else if (this.tapCount > 1) {
				this.handleZoom({ x: e.clientX, y: e.clientY });
			}
		} else if (this.pointers.length === 1) {
			this.point1 = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
			this.lastMove = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
		}
	}
	/**
	 * 处理pointercancel
	 * @param {PointerEvent} e
	 */
	NonameGallery.prototype.handlePointercancel = function (e) {
		this.tapCount = 0;
		this.isPointerdown = false;
		this.pointers.length = 0;
		if (this.isWrapAnimating) {
			// 长按图片呼出菜单后继续执行wrap动画
			this.handleWrapPointerup();
		}
	}
	/**
	 * 更新或删除指针
	 * @param {PointerEvent} e
	 * @param {string} type update delete
	 */
	NonameGallery.prototype.handlePointers = function (e, type) {
		for (let i = 0; i < this.pointers.length; i++) {
			if (this.pointers[i].pointerId === e.pointerId) {
				if (type === 'update') {
					this.pointers[i] = e;
				} else if (type === 'delete') {
					this.pointers.splice(i, 1);
				}
			}
		}
	}
	/**
	 * 处理视口宽高
	 */
	NonameGallery.prototype.handleResize = function () {
		// 设置视口大小
		this.setWindowSize();
		// 设置previewList
		this.previewList.length = 0;
		this.setPreviewList();
		// 设置当前图片数据
		const item = this.previewList[this.index];
		this.setCurrentImg(item.x, item.y, item.width, item.height, 1, 1, '');
		// 设置wrap宽度和x轴偏移量
		this.setWrap();
		this.wrap.style.width = this.wrapWidth + 'px';
		this.wrap.style.transform = 'translate3d(' + this.wrapX + 'px, 0, 0)';
		// 设置图片数据
		for (let i = 0, length = this.imgList.length; i < length; i++) {
			const item = this.previewList[i];
			item.element = this.imgList[i];
			item.element.style.width = item.width + 'px';
			item.element.style.height = item.height + 'px';
			if (this.options.useTransform) {
				item.element.style.transition = 'none';
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
			} else {
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0)';
			}
			item.element.style.cursor = 'zoom-in';
		}
		if (this.options.useTransform) {
			this.bg.style.transition = 'none';
		}
		this.bgOpacity = 1;
		this.bg.style.opacity = this.bgOpacity;
		this.tapCount = 0;
	}
	/**
	 * 处理keydown
	 * @param {KeyboardEvent} e
	 */
	NonameGallery.prototype.handleKeydown = function (e) {
		if (this.isAnimating || this.isWrapAnimating) {
			return;
		}
		const lastIndex = this.index;
		if (e.key === 'Escape') {
			this.close();
		} else if (['ArrowLeft', 'ArrowUp'].includes(e.key) && lastIndex > 0) {
			this.index--;
		} else if (['ArrowRight', 'ArrowDown'].includes(e.key) && lastIndex < this.previewList.length - 1) {
			this.index++;
		}
		window.cancelAnimationFrame(this.inertiaRafId);
		this.handleWrapSwipe();
		this.handleLastImg(lastIndex);
	}
	/**
	 * 处理缩放
	 */
	NonameGallery.prototype.handleZoom = function (point) {
		this.isAnimating = true;
		// 缩放时重置点击计数器
		this.tapCount = 0;
		const item = this.previewList[this.index];
		if (this.currentImg.scale > 1) {
			if (this.options.useTransform) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
				item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
			} else {
				const obj = {
					img: {
						width: { from: this.currentImg.width, to: item.width },
						height: { from: this.currentImg.height, to: item.height },
						x: { from: this.currentImg.x, to: item.x },
						y: { from: this.currentImg.y, to: item.y },
						index: this.index
					}
				}
				this.raf(obj);
			}
			item.element.style.cursor = 'zoom-in';
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, 1, '');
		} else {
			const halfWindowWidth = this.windowWidth / 2;
			const halfWindowHeight = this.windowHeight / 2;
			const left = this.decimal((point.x - item.x) * item.maxScale, 2);
			const top = this.decimal((point.y - item.y) * item.maxScale, 2);
			let x, y;
			if (item.maxWidth > this.windowWidth) {
				if (this.options.zoomToScreenCenter) {
					x = halfWindowWidth - left;
				} else {
					x = point.x - left;
				}
				if (x > 0) {
					x = 0;
				} else if (x < this.windowWidth - item.maxWidth) {
					x = this.windowWidth - item.maxWidth;
				}
			} else {
				x = (this.windowWidth - item.maxWidth) / 2;
			}
			x = this.decimal(x, 2);
			if (item.maxHeight > this.windowHeight) {
				if (this.options.zoomToScreenCenter) {
					y = halfWindowHeight - top;
				} else {
					y = point.y - top;
				}
				if (y > 0) {
					y = 0;
				} else if (y < this.windowHeight - item.maxHeight) {
					y = this.windowHeight - item.maxHeight;
				}
			} else {
				y = (this.windowHeight - item.maxHeight) / 2;
			}
			y = this.decimal(y, 2);
			if (this.options.useTransform) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
				item.element.style.transform = 'translate3d(' + x + 'px,' + y + 'px, 0) scale(' + item.maxScale + ')';
			} else {
				const obj = {
					img: {
						width: { from: item.width, to: item.maxWidth },
						height: { from: item.height, to: item.maxHeight },
						x: { from: item.x, to: x },
						y: { from: item.y, to: y },
						index: this.index
					}
				}
				this.raf(obj);
			}
			item.element.style.cursor = 'zoom-out';
			this.setCurrentImg(x, y, item.maxWidth, item.maxHeight, item.maxScale, 1, '');
		}
	}
	/**
	 * 处理双指缩放
	 * @param {object} a 第一个点的位置
	 * @param {object} b 第二个点的位置
	 */
	NonameGallery.prototype.handlePinch = function (a, b) {
		const MIN_SCALE = 0.7;
		this.pinchTime = Date.now();
		let ratio = this.getDistance(a, b) / this.getDistance(this.lastPoint1, this.lastPoint2);
		let scale = this.decimal(this.currentImg.scale * ratio, 5);
		const item = this.previewList[this.index];
		if (scale > item.maxScale) {
			this.currentImg.scale = item.maxScale;
			this.currentImg.width = item.maxWidth;
			this.currentImg.height = item.maxHeight;
			ratio = item.maxScale / this.currentImg.scale;
		} else if (scale < MIN_SCALE) {
			this.currentImg.scale = MIN_SCALE;
			this.currentImg.width = this.decimal(item.width * MIN_SCALE, 2);
			this.currentImg.height = this.decimal(item.height * MIN_SCALE, 2);
			ratio = MIN_SCALE / this.currentImg.scale;
		} else {
			this.currentImg.scale = scale;
			this.currentImg.width = this.decimal(this.currentImg.width * ratio, 2);
			this.currentImg.height = this.decimal(this.currentImg.height * ratio, 2);
		}
		this.currentImg.status = this.currentImg.scale < 1 ? 'shrink' : '';
		const center = this.getCenter(a, b);
		// 计算偏移量
		this.currentImg.x -= (ratio - 1) * (center.x - this.currentImg.x) - center.x + this.lastCenter.x;
		this.currentImg.y -= (ratio - 1) * (center.y - this.currentImg.y) - center.y + this.lastCenter.y;
		this.lastCenter = { x: center.x, y: center.y };
		this.handleBoundary();
		if (this.options.useTransform) {
			item.element.style.transition = 'none';
			item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0) scale(' + this.currentImg.scale + ')';
		} else {
			item.element.style.width = this.currentImg.width + 'px';
			item.element.style.height = this.currentImg.height + 'px';
			item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0)';
		}
	}
	/**
	 * 处理边界
	 */
	NonameGallery.prototype.handleBoundary = function () {
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
	/**
	 * 获取图片缩放尺寸
	 * @param {number} naturalWidth 图片自然宽度
	 * @param {number} naturalHeight 图片自然高度
	 * @param {number} maxWidth 图片显示最大宽度
	 * @param {number} maxHeight 图片显示最大高度
	 * @returns 
	 */
	NonameGallery.prototype.getImgSize = function (naturalWidth, naturalHeight, maxWidth, maxHeight) {
		const imgRatio = naturalWidth / naturalHeight;
		const maxRatio = maxWidth / maxHeight;
		let width, height;
		// 如果图片自然宽高比例 >= 显示宽高比例
		if (imgRatio >= maxRatio) {
			if (naturalWidth > maxWidth) {
				width = maxWidth;
				height = maxWidth / naturalWidth * naturalHeight;
			} else {
				width = naturalWidth;
				height = naturalHeight;
			}
		} else {
			if (naturalHeight > maxHeight) {
				width = maxHeight / naturalHeight * naturalWidth;
				height = maxHeight;
			} else {
				width = naturalWidth;
				height = naturalHeight;
			}
		}
		return { width: width, height: height }
	}
	/**
	 * 获取拖拽方向
	 */
	NonameGallery.prototype.getDragDirection = function () {
		if (Math.abs(this.distance.x) > Math.abs(this.distance.y)) {
			this.dragDirection = 'h';
		} else {
			this.dragDirection = 'v';
		}
	}
	/**
	 * 获取拖拽目标
	 */
	NonameGallery.prototype.getDragTarget = function () {
		let flag1 = false, flag2 = false;
		if (this.currentImg.width > this.windowWidth) {
			if (
				(this.diff.x > 0 && this.currentImg.x === 0) ||
				(this.diff.x < 0 && this.currentImg.x === this.windowWidth - this.currentImg.width)
			) {
				flag1 = true;
			}
		} else {
			if (this.currentImg.width >= this.previewList[this.index].width) {
				flag2 = true;
			}
		}
		if (this.dragDirection === 'h' && (flag1 || flag2)) {
			this.dragTarget = 'wrap';
		} else {
			this.dragTarget = 'img';
		}
	}
	/**
	 * 获取两点距离
	 * @param {object} a 第一个点的位置
	 * @param {object} b 第二个点的位置
	 * @returns 
	 */
	NonameGallery.prototype.getDistance = function (a, b) {
		const x = a.x - b.x;
		const y = a.y - b.y;
		return Math.hypot(x, y); // Math.sqrt(x * x + y * y);
	}
	/**
	 * 处理wrap移动
	 */
	NonameGallery.prototype.handleWrapPointermove = function () {
		if (this.wrapX > 0 || this.wrapX < (this.previewList.length - 1) * this.windowWidth * - 1) {
			this.wrapX += this.diff.x * 0.3;
		} else {
			this.wrapX += this.diff.x;
			const LEFT_X = (this.index - 1) * this.windowWidth * -1;
			const RIGHT_X = (this.index + 1) * this.windowWidth * -1;
			if (this.wrapX > LEFT_X) {
				this.wrapX = LEFT_X;
			} else if (this.wrapX < RIGHT_X) {
				this.wrapX = RIGHT_X;
			}
		}
		this.wrap.style.transform = 'translate3d(' + this.wrapX + 'px, 0, 0)';
	}
	/**
	 * 处理img移动
	 */
	NonameGallery.prototype.handleImgPointermove = function () {
		const item = this.previewList[this.index];
		// 如果图片当前宽高大于视口宽高，拖拽查看图片，可惯性滚动
		if (this.currentImg.width > this.windowWidth || this.currentImg.height > this.windowHeight) {
			this.currentImg.x += this.diff.x;
			this.currentImg.y += this.diff.y;
			this.handleBoundary();
			this.currentImg.status = 'inertia';
			if (this.options.useTransform) {
				item.element.style.transition = 'none';
				item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0) scale(' + this.currentImg.scale + ')';
			} else {
				item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0)';
			}
		} else {
			// 如果垂直拖拽图片且图片未被放大（某些图片尺寸放到最大也没有超出视口宽高）
			if (this.dragDirection === 'v' && this.currentImg.width <= item.width && this.currentImg.height <= item.height) {
				this.currentImg.status = 'verticalToClose';
				this.bgOpacity = this.decimal(1 - Math.abs(this.distance.y) / (this.windowHeight / 1.2), 5);
				if (this.bgOpacity < 0) {
					this.bgOpacity = 0;
				}
				if (this.options.verticalZoom) {
					this.currentImg.scale = this.bgOpacity;
					this.currentImg.width = this.decimal(item.width * this.currentImg.scale, 2);
					this.currentImg.height = this.decimal(item.height * this.currentImg.scale, 2);
					this.currentImg.x = item.x + this.distance.x + (item.width - this.currentImg.width) / 2;
					this.currentImg.y = item.y + this.distance.y + (item.height - this.currentImg.height) / 2;
				} else {
					this.currentImg.x = item.x;
					this.currentImg.y = item.y + this.distance.y;
					this.currentImg.scale = 1;
				}
				this.bg.style.opacity = this.bgOpacity;
				if (this.options.useTransform) {
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
	/**
	 * 处理wrap移动结束
	 */
	NonameGallery.prototype.handleWrapPointerup = function () {
		// 拖拽距离超过屏幕宽度10%即可切换下一张图片
		const MIN_SWIPE_DISTANCE = Math.round(this.windowWidth * 0.1);
		const lastIndex = this.index;
		if (Math.abs(this.distance.x) > MIN_SWIPE_DISTANCE) {
			if (this.distance.x > 0 && lastIndex > 0) {
				this.index--;
			} else if (this.distance.x < 0 && lastIndex < this.previewList.length - 1) {
				this.index++;
			}
		}
		this.handleWrapSwipe();
		this.handleLastImg(lastIndex);
	}
	/**
	 * 处理img移动结束
	 */
	NonameGallery.prototype.handleImgPointerup = function () {
		// 垂直滑动距离超过屏幕高度10%即可关闭画廊
		const MIN_CLOSE_DISTANCE = Math.round(this.windowHeight * 0.1);
		const item = this.previewList[this.index];
		const now = Date.now();
		if (this.currentImg.status === 'inertia' && now - this.pointermoveTime < 200 && now - this.pinchTime > 1000) {
			this.handleInertia();
		} else if (this.currentImg.status === 'verticalToClose' && Math.abs(this.distance.y) >= MIN_CLOSE_DISTANCE) {
			this.close();
		} else if (this.currentImg.status === 'shrink' || (this.currentImg.status == 'verticalToClose' && Math.abs(this.distance.y) < MIN_CLOSE_DISTANCE)) {
			this.isAnimating = true;
			if (this.options.useTransform) {
				this.bg.style.opacity = '1';
				item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
			} else {
				const obj = {
					bg: {
						opacity: { from: this.bgOpacity, to: 1 }
					},
					img: {
						width: { from: this.currentImg.width, to: item.width },
						height: { from: this.currentImg.height, to: item.height },
						x: { from: this.currentImg.x, to: item.x },
						y: { from: this.currentImg.y, to: item.y },
						index: this.index
					}
				}
				this.raf(obj);
			}
			this.bgOpacity = 1;
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, 1, '');
		}
		if (this.isAnimating === false) {
			this.dragTarget = '';
			this.dragDirection = '';
		}
	}
	/**
	 * 处理惯性滚动
	 */
	NonameGallery.prototype.handleInertia = function () {
		const item = this.previewList[this.index];
		const speed = { x: this.diff.x, y: this.diff.y };
		const self = this;
		function step(timestamp) {
			speed.x *= 0.95;
			speed.y *= 0.95;
			self.currentImg.x = self.decimal(self.currentImg.x + speed.x, 2);
			self.currentImg.y = self.decimal(self.currentImg.y + speed.y, 2);
			self.handleBoundary();
			if (self.options.useTransform) {
				item.element.style.transform = 'translate3d(' + self.currentImg.x + 'px, ' + self.currentImg.y + 'px, 0) scale(' + self.currentImg.scale + ')';
			} else {
				item.element.style.transform = 'translate3d(' + self.currentImg.x + 'px, ' + self.currentImg.y + 'px, 0)';
			}
			if (Math.abs(speed.x) > 1 || Math.abs(speed.y) > 1) {
				self.inertiaRafId = window.requestAnimationFrame(step);
			}
		}
		this.inertiaRafId = window.requestAnimationFrame(step);
	}
	/**
	 * 处理wrap滑动
	 */
	NonameGallery.prototype.handleWrapSwipe = function () {
		this.isWrapAnimating = true;
		const obj = {
			wrap: {
				x: { from: this.wrapX, to: this.windowWidth * this.index * -1 }
			}
		}
		this.wrapRaf(obj);
		this.counter.innerHTML = (this.index + 1) + ' / ' + this.previewList.length;
	}
	/**
	 * 处理上一张图片
	 * @param {number} lastIndex 
	 */
	NonameGallery.prototype.handleLastImg = function (lastIndex) {
		// 根据索引判断是否切换图片
		if (this.index !== lastIndex) {
			// 如果上一张图片放大过，则恢复
			if (this.currentImg.scale > 1) {
				const lastItem = this.previewList[lastIndex];
				if (this.options.useTransform) {
					lastItem.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
					lastItem.element.style.transform = 'translate3d(' + lastItem.x + 'px, ' + lastItem.y + 'px, 0) scale(1)';
				} else {
					const obj = {
						img: {
							width: { from: this.currentImg.width, to: lastItem.width },
							height: { from: this.currentImg.height, to: lastItem.height },
							x: { from: this.currentImg.x, to: lastItem.x },
							y: { from: this.currentImg.y, to: lastItem.y },
							index: lastIndex
						}
					}
					this.raf(obj);
				}
				lastItem.element.style.cursor = 'zoom-in';
			}
			// 设置当前图片数据
			const item = this.previewList[this.index];
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, 1, '');
		}
	}
	/**
	 * 过渡结束回调
	 * @param {TransitionEvent } e 
	 */
	NonameGallery.prototype.handleTransitionEnd = function (e) {
		// 过滤掉bg transitionend
		if (e.target.tagName === 'IMG') {
			// wrap滑动，上一张图片恢复动画完成后，不清除dragTarget，因为wrap动画可打断
			if (e.target === this.previewList[this.index].element) {
				this.isAnimating = false;
				this.dragTarget = '';
				this.dragDirection = '';
			}
			if (this.status === 'close') {
				// 解绑事件
				this.unbindEventListener();
				this.container.remove();
			}
		}
	}
	/**
	 * 保留n位小数
	 * @param {number} num 数字
	 * @param {number} n n位小数
	 * @returns 
	 */
	NonameGallery.prototype.decimal = function (num, n) {
		const x = Math.pow(10, n);
		return Math.round(num * x) / x;
	}
	/**
	 * 获取中心点
	 * @param {object} a 第一个点的位置
	 * @param {object} b 第二个点的位置
	 * @returns 
	 */
	NonameGallery.prototype.getCenter = function (a, b) {
		const x = (a.x + b.x) / 2;
		const y = (a.y + b.y) / 2;
		return { x: x, y: y };
	}
	/**
	 * 曲线函数
	 * @param {number} from 开始位置
	 * @param {number} to 结束位置
	 * @param {number} time 动画已执行的时间
	 * @param {number} duration 动画时长
	 * @returns 
	 */
	NonameGallery.prototype.easeOut = function (from, to, time, duration) {
		const change = to - from;
		const t = time / duration;
		return -change * t * (t - 2) + from;
	}
	/**
	 * 开始、结束、缩放、恢复（例如下滑关闭未达到临界值）动画函数
	 * @param {object} obj 属性
	 */
	NonameGallery.prototype.raf = function (obj) {
		const self = this;
		let start;
		let count = 0;
		const duration = this.options.duration;
		const item = this.previewList[obj.img.index];
		function step(timestamp) {
			if (start === undefined) {
				start = timestamp;
			}
			let time = timestamp - start;
			if (time > duration) {
				time = duration;
				count++;
			}
			if (obj.bg) {
				const bgOpacity = self.decimal(self.easeOut(obj.bg.opacity.from, obj.bg.opacity.to, time, duration), 5);
				self.bg.style.opacity = bgOpacity;
			}
			if (obj.img.opacity) {
				const opacity = self.decimal(self.easeOut(obj.img.opacity.from, obj.img.opacity.to, time, duration), 5);
				item.element.style.opacity = opacity;
			}
			const width = self.decimal(self.easeOut(obj.img.width.from, obj.img.width.to, time, duration), 2);
			const height = self.decimal(self.easeOut(obj.img.height.from, obj.img.height.to, time, duration), 2);
			const x = self.decimal(self.easeOut(obj.img.x.from, obj.img.x.to, time, duration), 2);
			const y = self.decimal(self.easeOut(obj.img.y.from, obj.img.y.to, time, duration), 2);
			item.element.style.width = width + 'px';
			item.element.style.height = height + 'px';
			item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
			if (count <= 1) {
				window.requestAnimationFrame(step);
			} else {
				if (obj.img.index === self.index) {
					self.isAnimating = false;
					self.dragTarget = '';
					self.dragDirection = '';
				}
				if (self.status === 'close') {
					self.unbindEventListener();
					self.container.remove();
				}
			}
		}
		window.requestAnimationFrame(step);
	}
	/**
	 * 动画函数
	 * @param {object} obj 
	 */
	NonameGallery.prototype.wrapRaf = function (obj) {
		const self = this;
		let start;
		let count = 0;
		const duration = this.options.duration;
		function step(timestamp) {
			if (start === undefined) {
				start = timestamp;
			}
			let time = timestamp - start;
			if (time > duration) {
				time = duration;
				count++;
			}
			self.wrapX = self.decimal(self.easeOut(obj.wrap.x.from, obj.wrap.x.to, time, duration), 2);
			self.wrap.style.transform = 'translate3d(' + self.wrapX + 'px, 0, 0)';
			if (count <= 1) {
				self.wrapRafId = window.requestAnimationFrame(step);
			} else {
				self.isWrapAnimating = false;
				self.dragTarget = '';
				self.dragDirection = '';
			}
		}
		this.wrapRafId = window.requestAnimationFrame(step);
	}
	if (typeof define === 'function' && define.amd) {
		define(function () { return NonameGallery; });
	} else if (typeof module === 'object' && typeof exports === 'object') {
		module.exports = NonameGallery;
	} else {
		window.NonameGallery = NonameGallery;
	}
})();