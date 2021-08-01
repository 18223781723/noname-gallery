; (function () {
	'use strict';
	/**
	 * 使用PointerEvent实现的图片预览插件
	 * @param {object} options 
	 */
	function NonameGallery(options) {
		this.options = Object.assign({}, this.defaults, options);
		this.container = null; // .noname-gallery-container
		this.bg = null; // .noname-gallery-bg
		this.wrap = null; // .noname-gallery-wrap
		this.counter = null; // .noname-gallery-counter
		this.imgList = null; // .noname-gallery-img
		this.bgOpacity = 1; // .noname-gallery-bg 透明度
		this.windowWidth = 0; // 视口宽度
		this.windowHeight = 0; // 视口高度
		this.previewList = []; // 预览图片列表
		this.index = this.options.index; // 预览图片索引
		this.wrapWidth = 0; // .noname-gallery-wrap 宽度
		this.wrapX = 0; // .noname-gallery-wrap x轴偏移量
		this.currentImg = {
			x: 0, // 当前图片旋转中心(已设置为左上角)相对屏幕左上角偏移值
			y: 0, // 当前图片旋转中心(已设置为左上角)相对屏幕左上角偏移值
			width: 0, // 当前图片宽度
			height: 0, // 当前图片高度
			scale: 1, // 当前图片缩放倍数
			status: '' // 当前图片状态 shrink(scale < 1) verticalToClose inertia
		};
		this.pointers = []; // 指针数组用于保存多个触摸点
		this.point = { x: 0, y: 0 }; // 第一个点坐标
		this.point2 = { x: 0, y: 0 }; // 第二个点坐标
		this.diff = { x: 0, y: 0 }; // 相对于上一次移动差值
		this.distance = { x: 0, y: 0 }; // 移动距离
		this.lastDistance = { x: 0, y: 0 }; // 双指滑动时记录上一次移动距离
		this.lastPoint = { x: 0, y: 0 }; // 上一次点击坐标，用于判断双击距离是否大于30
		this.lastMove = { x: 0, y: 0 }; // 上一次移动坐标
		this.lastCenter = { x: 0, y: 0 }; // 上一次双指中心位置
		this.lastScale = 1; // 上一次双指距离比例
		this.tapCount = 0; // 点击次数 1 = 单击 大于1 = 双击
		this.dragDirection = ''; // 拖拽方向 v(vertical) h(horizontal)
		this.dragTarget = ''; // 拖拽目标 wrap img
		this.isPointerdown = false; // 按下标识
		this.tapTimeout = null; // 单击延时器 250ms 判断双击
		this.pointerdownTime = null; // pointerdown time
		this.pointermoveTime = null; // 鼠标松开距离最后一次移动小于200ms执行惯性滑动
		this.pinchTime = null; // 距离上一次双指缩放的时间
		this.isAnimating = false; // 是否正在执行缩放动画
		this.rafId = null; // requestAnimationFrame id 用于停止惯性滑动动画
	}
	/**
	 * 默认配置项
	 */
	NonameGallery.prototype.defaults = {
		list: [], // HTMLImageElement[]
		index: 0, // 索引
		fadeInOut: true, // 淡入淡出
		useTransition: true, // 使用transition实现动画或requestAnimationFrame
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
		// 抛出错误
		if (this.options.list.length === 0) {
			throw new Error('options.list can not be empty array');
		}
		// 设置视口大小
		this.setWindowSize();
		// 设置previewList
		this.setPreviewList();
		// 设置当前图片数据
		const item = this.previewList[this.index];
		this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		// 设置wrap宽度和x轴偏移量
		this.setWrap();
		// 渲染
		this.render();
		// 设置属性值
		this.setProperties();
		// 打开画廊
		this.open();
		// 开始动画执行完毕再绑定事件
		setTimeout(() => {
			this.bindEventListener();
		}, this.options.duration);
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
		this.previewList = [];
		for (const item of this.options.list) {
			const result = this.getImgSize(item.naturalWidth, item.naturalHeight, this.windowWidth, this.windowHeight);
			const rect = item.getBoundingClientRect();
			const maxScale = Math.max(this.decimal(item.naturalWidth / result.width, 5), this.options.minScale);
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
	 * @param {string} status 状态 shrink verticalToClose inertia
	 */
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
		let cssText = 'opacity: 0;';
		if (this.options.useTransition) {
			cssText += ' transition: opacity ' + this.options.duration + 'ms ease-out;';
		}
		let html = '<div class="noname-gallery-container">'
			+ '<div class="noname-gallery-bg" style="' + cssText + '"></div>'
			+ '<div class="noname-gallery-counter">' + (this.options.index + 1)
			+ ' / ' + this.options.list.length + '</div>'
			+ '<ul class="noname-gallery-wrap" style="width: ' + this.wrapWidth
			+ 'px; transform: translate3d(' + this.wrapX + 'px, 0, 0)">';
		for (let i = 0, length = this.options.list.length; i < length; i++) {
			const item = this.previewList[i];
			cssText = '';
			if (this.options.useTransition) {
				cssText = 'width: ' + item.width + 'px; height: ' + item.height + 'px;';
				if (this.index === i) {
					cssText += 'transform: translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y
						+ 'px, 0) scale(' + item.thumbnail.scaleX + ', ' + item.thumbnail.scaleY + ');';
					if (this.options.fadeInOut) {
						cssText += ' opacity: 0;';
					}
				} else {
					cssText += 'transform: translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1);';
				}
				cssText += ' transition: transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out;';
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
	/**
	 * 设置属性值
	 */
	NonameGallery.prototype.setProperties = function () {
		this.container = document.querySelector('.noname-gallery-container');
		this.wrap = document.querySelector('.noname-gallery-wrap');
		this.bg = document.querySelector('.noname-gallery-bg');
		this.counter = document.querySelector('.noname-gallery-counter');
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
		if (this.options.useTransition) {
			// 强制重绘，否则合并计算样式，导致无法触发过渡效果，或使用setTimeout，个人猜测最短时长等于，1000 / 60 = 16.66666 ≈ 17
			window.getComputedStyle(item.element).opacity;
			this.bg.style.opacity = '1';
			if (this.options.fadeInOut) {
				item.element.style.opacity = '1';
			}
			item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
		} else {
			this.raf((time) => {
				// bg
				const opacity = this.decimal(this.easeOut(0, 1, time, this.options.duration), 5);
				this.bg.style.opacity = opacity;
				// img
				const width = this.decimal(this.easeOut(item.thumbnail.width, item.width, time, this.options.duration), 2);
				const height = this.decimal(this.easeOut(item.thumbnail.height, item.height, time, this.options.duration), 2);
				const x = this.decimal(this.easeOut(item.thumbnail.x, item.x, time, this.options.duration), 2);
				const y = this.decimal(this.easeOut(item.thumbnail.y, item.y, time, this.options.duration), 2);
				item.element.style.width = width + 'px';
				item.element.style.height = height + 'px';
				item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
				if (this.options.fadeInOut) item.element.style.opacity = opacity;
			}, this.options.duration);
		}
	}
	/**
	 * 关闭画廊
	 */
	NonameGallery.prototype.close = function () {
		const item = this.previewList[this.index];
		if (this.options.useTransition) {
			if (this.options.fadeInOut) {
				item.element.style.opacity = '0';
			}
			item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
			item.element.style.transform = 'translate3d(' + item.thumbnail.x + 'px, ' + item.thumbnail.y + 'px, 0) scale(' + item.thumbnail.scaleX + ', ' + item.thumbnail.scaleY + ')';
			this.bg.style.transition = 'opacity ' + this.options.duration + 'ms ease-out';
			this.bg.style.opacity = '0';
		} else {
			this.raf((time) => {
				// bg
				const bgOpacity = this.decimal(this.easeOut(this.bgOpacity, 0, time, this.options.duration), 5);
				this.bg.style.opacity = bgOpacity;
				// img
				const width = this.decimal(this.easeOut(this.currentImg.width, item.thumbnail.width, time, this.options.duration), 2);
				const height = this.decimal(this.easeOut(this.currentImg.height, item.thumbnail.height, time, this.options.duration), 2);
				const x = this.decimal(this.easeOut(this.currentImg.x, item.thumbnail.x, time, this.options.duration), 2);
				const y = this.decimal(this.easeOut(this.currentImg.y, item.thumbnail.y, time, this.options.duration), 2);
				item.element.style.width = width + 'px';
				item.element.style.height = height + 'px';
				item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
				if (this.options.fadeInOut) {
					const opacity = this.decimal(this.easeOut(1, 0, time, this.options.duration), 5);
					item.element.style.opacity = opacity;
				}
			}, this.options.duration);
		}
		// 解绑事件
		this.unbindEventListener();
		// 关闭动画结束后移除
		setTimeout(() => {
			this.container.remove();
		}, this.options.duration);
		this.tapCount = 0;
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

		this.container.addEventListener('pointerdown', this.handlePointerdown);
		this.container.addEventListener('pointermove', this.handlePointermove);
		this.container.addEventListener('pointerup', this.handlePointerup);
		this.container.addEventListener('pointercancel', this.handlePointercancel);
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
		// 只响应鼠标左键
		if (e.pointerType === 'mouse' && e.button !== 0 || this.isAnimating) {
			return;
		}
		this.pointers.push(e);
		this.point = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
		if (this.pointers.length === 1) {
			this.container.setPointerCapture(e.pointerId);
			this.isPointerdown = true;
			this.tapCount++;
			this.dragDirection = '';
			this.dragTarget = '';
			this.distance = { x: 0, y: 0 };
			this.lastDistance = { x: 0, y: 0 };
			this.pointerdownTime = Date.now();
			this.pinchTime = null;
			this.lastMove = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
			// 双击两点距离不超过30
			if (this.tapCount > 1 && (Math.abs(this.point.x - this.lastPoint.x) > 30 || Math.abs(this.point.y - this.lastPoint.y) > 30)) {
				this.tapCount = 1;
			}
			clearTimeout(this.tapTimeout);
			window.cancelAnimationFrame(this.rafId);
			this.lastPoint = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
		} else if (this.pointers.length === 2) {
			this.point2 = { x: this.pointers[1].clientX, y: this.pointers[1].clientY };
			if (this.dragTarget === '') {
				this.dragTarget = 'img';
			}
			this.tapCount = 0;
			this.lastScale = 1;
			this.lastCenter = this.getCenter(this.point, this.point2);
			this.lastDistance = { x: this.distance.x, y: this.distance.y };
		}
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
		const current = { x: e.clientX, y: e.clientY };
		if (this.pointers.length === 1) {
			// 双指缩小后，离开一根手指，另一根手指继续移动
			if (this.currentImg.status !== 'shrink') {
				this.diff = { x: current.x - this.lastMove.x, y: current.y - this.lastMove.y };
				this.distance = { x: current.x - this.point.x + this.lastDistance.x, y: current.y - this.point.y + this.lastDistance.y };
				this.lastMove = { x: current.x, y: current.y };
				this.pointermoveTime = Date.now();
				// 偏移量大于10才判断dragDirection和dragTarget
				if (this.dragDirection === '' && this.dragTarget === '' && (Math.abs(this.distance.x) > 10 || Math.abs(this.distance.y) > 10)) {
					this.tapCount = 0;
					this.getDragDirection();
					this.getDragTarget();
				}
				if (this.dragTarget === 'wrap') {
					this.handleWrapPointermove();
				} else if (this.dragTarget === 'img') {
					this.handleImgPointermove();
				}
			}
		} else if (this.pointers.length === 2) {
			if (this.dragTarget === 'img' && this.currentImg.status !== 'verticalToClose') {
				this.handlePinch(e);
			}
		}
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
			this.point = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
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
		this.setPreviewList();
		// 设置当前图片数据
		const item = this.previewList[this.index];
		this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		// 设置wrap宽度和x轴偏移量
		this.setWrap();
		for (let i = 0, length = this.imgList.length; i < length; i++) {
			const item = this.previewList[i];
			item.element = this.imgList[i];
			item.element.style.width = item.width + 'px';
			item.element.style.height = item.height + 'px';
			if (this.options.useTransition) {
				item.element.style.transition = 'none';
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
			} else {
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0)';
			}
			item.element.style.cursor = 'zoom-in';
		}
		if (this.options.useTransition) {
			this.bg.style.transition = 'none';
			this.wrap.style.transition = 'none';
		}
		this.bg.style.opacity = '1';
		this.wrap.style.width = this.wrapWidth + 'px';
		this.wrap.style.transform = 'translate3d(' + this.wrapX + 'px, 0, 0)';
		this.tapCount = 0;
		this.bgOpacity = 1;
	}
	/**
	 * 处理keydown
	 * @param {KeyboardEvent} e
	 */
	NonameGallery.prototype.handleKeydown = function (e) {
		const lastIndex = this.index;
		if (e.key === 'Escape') {
			this.close();
		} else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
			if (this.index > 0) this.index--;
		} else if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
			if (this.index < this.previewList.length - 1) this.index++;
		}
		if (lastIndex !== this.index) this.handleWrapSwipe(lastIndex);
	}
	/**
	 * 处理缩放
	 */
	NonameGallery.prototype.handleZoom = function (point) {
		const item = this.previewList[this.index];
		if (this.currentImg.scale > 1) {
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
				item.element.style.transform = 'translate3d(' + item.x + 'px,' + item.y + 'px, 0) scale(1)';
			} else {
				const widthFrom = this.currentImg.width;
				const heightFrom = this.currentImg.height;
				const xFrom = this.currentImg.x;
				const yFrom = this.currentImg.y;
				this.raf((time) => {
					const width = this.decimal(this.easeOut(widthFrom, item.width, time, this.options.duration), 2);
					const height = this.decimal(this.easeOut(heightFrom, item.height, time, this.options.duration), 2);
					const x = this.decimal(this.easeOut(xFrom, item.x, time, this.options.duration), 2);
					const y = this.decimal(this.easeOut(yFrom, item.y, time, this.options.duration), 2);
					item.element.style.width = width + 'px';
					item.element.style.height = height + 'px';
					item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
				}, this.options.duration);
			}
			item.element.style.cursor = 'zoom-in';
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		} else {
			const halfWindowWidth = this.windowWidth / 2;
			const halfWindowHeight = this.windowHeight / 2;
			const left = this.decimal((point.x - item.x) * item.maxScale, 2);
			const top = this.decimal((point.y - item.y) * item.maxScale, 2);
			let xTo, yTo;
			if (item.maxWidth > this.windowWidth) {
				if (this.options.zoomToScreenCenter) {
					xTo = halfWindowWidth - left;
				} else {
					xTo = point.x - left;
				}
				if (xTo > 0) {
					xTo = 0;
				} else if (xTo < this.windowWidth - item.maxWidth) {
					xTo = this.windowWidth - item.maxWidth;
				}
			} else {
				xTo = (this.windowWidth - item.maxWidth) / 2;
			}
			xTo = this.decimal(xTo, 2);
			if (item.maxHeight > this.windowHeight) {
				if (this.options.zoomToScreenCenter) {
					yTo = halfWindowHeight - top;
				} else {
					yTo = point.y - top;
				}
				if (yTo > 0) {
					yTo = 0;
				} else if (yTo < this.windowHeight - item.maxHeight) {
					yTo = this.windowHeight - item.maxHeight;
				}
			} else {
				yTo = (this.windowHeight - item.maxHeight) / 2;
			}
			yTo = this.decimal(yTo, 2);
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
				item.element.style.transform = 'translate3d(' + xTo + 'px,' + yTo + 'px, 0) scale(' + item.maxScale + ')';
			} else {
				this.raf((time) => {
					const width = this.decimal(this.easeOut(item.width, item.maxWidth, time, this.options.duration), 2);
					const height = this.decimal(this.easeOut(item.height, item.maxHeight, time, this.options.duration), 2);
					const x = this.decimal(this.easeOut(item.x, xTo, time, this.options.duration), 2);
					const y = this.decimal(this.easeOut(item.y, yTo, time, this.options.duration), 2);
					item.element.style.width = width + 'px';
					item.element.style.height = height + 'px';
					item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
				}, this.options.duration);
			}
			item.element.style.cursor = 'zoom-out';
			this.setCurrentImg(xTo, yTo, item.maxWidth, item.maxHeight, item.maxScale, '');
		}
		this.setIsAnimating();
		this.tapCount = 0;
	}
	/**
	 * 处理双指缩放
	 */
	NonameGallery.prototype.handlePinch = function () {
		const MIN_SCALE = 0.7;
		const item = this.previewList[this.index];
		const current = { x: this.pointers[0].clientX, y: this.pointers[0].clientY };
		const current2 = { x: this.pointers[1].clientX, y: this.pointers[1].clientY };
		const scale = this.getDistance(current, current2) / this.getDistance(this.point, this.point2);
		let ratio = scale / this.lastScale;
		this.pinchTime = Date.now();
		this.currentImg.scale = this.decimal(this.currentImg.scale * ratio, 5);
		this.currentImg.width = this.decimal(this.currentImg.width * ratio, 2);
		this.currentImg.height = this.decimal(this.currentImg.height * ratio, 2);
		if (this.currentImg.scale > item.maxScale) {
			this.currentImg.scale = item.maxScale;
			this.currentImg.width = item.maxWidth;
			this.currentImg.height = item.maxHeight;
			ratio = 1;
		} else if (this.currentImg.scale < MIN_SCALE) {
			this.currentImg.scale = MIN_SCALE;
			this.currentImg.width = this.decimal(item.width * MIN_SCALE, 2);
			this.currentImg.height = this.decimal(item.height * MIN_SCALE, 2);
			ratio = 1;
		}
		this.currentImg.status = this.currentImg.scale < 1 ? 'shrink' : '';
		this.lastScale = scale;
		const center = this.getCenter(current, current2);
		// 计算偏移量
		this.currentImg.x -= (ratio - 1) * (center.x - this.currentImg.x) - center.x + this.lastCenter.x;
		this.currentImg.y -= (ratio - 1) * (center.y - this.currentImg.y) - center.y + this.lastCenter.y;;
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
		let flag = false, flag2 = false;
		if (this.currentImg.width > this.windowWidth) {
			if (
				(this.diff.x > 0 && this.currentImg.x === 0) ||
				(this.diff.x < 0 && this.currentImg.x === this.windowWidth - this.currentImg.width)
			) {
				flag = true;
			}
		} else {
			if (this.currentImg.width >= this.previewList[this.index].width) {
				flag2 = true;
			}
		}
		if (this.dragDirection === 'h' && (flag || flag2)) {
			this.dragTarget = 'wrap';
		} else {
			this.dragTarget = 'img';
		}
	}
	/**
	 * 获取两点距离
	 * @param {object} point
	 * @param {object} point2
	 * @returns 
	 */
	NonameGallery.prototype.getDistance = function (point, point2) {
		const x = point.x - point2.x;
		const y = point.y - point2.y;
		return Math.hypot(x, y); // Math.sqrt(x * x + y * y);
	}
	/**
	 * 处理wrap移动
	 */
	NonameGallery.prototype.handleWrapPointermove = function () {
		if (this.wrapX > 0 ||
			this.wrapX < - 1 * (this.previewList.length - 1) * this.windowWidth) {
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
		if (this.options.useTransition) {
			this.wrap.style.transition = 'none';
		}
		this.wrap.style.transform = 'translate3d(' + this.wrapX + 'px, 0, 0)';
	}
	/**
	 * 处理img移动
	 */
	NonameGallery.prototype.handleImgPointermove = function () {
		const item = this.previewList[this.index];
		// 如果图片当前宽高大于视口宽高，拖拽查看图片
		if (this.currentImg.width > this.windowWidth || this.currentImg.height > this.windowHeight) {
			this.currentImg.x += this.diff.x;
			this.currentImg.y += this.diff.y;
			this.handleBoundary();
			this.currentImg.status = 'inertia';
			if (this.options.useTransition) {
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
	/**
	 * 处理wrap移动结束
	 */
	NonameGallery.prototype.handleWrapPointerup = function () {
		const MIN_SWIPE_DISTANCE = Math.round(this.windowWidth * 0.1);
		const lastIndex = this.index;
		if (Math.abs(this.distance.x) > MIN_SWIPE_DISTANCE) {
			if (this.distance.x > 0) {
				if (lastIndex > 0) this.index--;
			} else if (this.distance.x < 0) {
				if (lastIndex < this.previewList.length - 1) this.index++;
			}
		}
		this.handleWrapSwipe(lastIndex);
	}
	/**
	 * 处理img移动结束
	 */
	NonameGallery.prototype.handleImgPointerup = function () {
		const MIN_CLOSE_DISTANCE = Math.round(this.windowHeight * 0.15);
		const item = this.previewList[this.index];
		const now = Date.now();
		if (this.currentImg.status === 'inertia' && now - this.pointermoveTime < 200 && now - this.pinchTime > 1000) {
			this.handleInertia();
		} else if (this.currentImg.status === 'verticalToClose' && Math.abs(this.distance.y) >= MIN_CLOSE_DISTANCE) {
			this.close();
		} else if (this.currentImg.status === 'shrink' || (this.currentImg.status == 'verticalToClose' && Math.abs(this.distance.y) < MIN_CLOSE_DISTANCE)) {
			if (this.options.useTransition) {
				item.element.style.transition = 'transform ' + this.options.duration + 'ms ease-out, opacity ' + this.options.duration + 'ms ease-out';
				item.element.style.transform = 'translate3d(' + item.x + 'px, ' + item.y + 'px, 0) scale(1)';
				this.bg.style.opacity = '1';
			} else {
				const bgOpacityFrom = this.bgOpacity;
				const widthFrom = this.currentImg.width;
				const heightFrom = this.currentImg.height;
				const xFrom = this.currentImg.x;
				const yFrom = this.currentImg.y;
				this.raf((time) => {
					const bgOpacity = this.decimal(this.easeOut(bgOpacityFrom, 1, time, this.options.duration), 5);
					this.bg.style.opacity = bgOpacity;
					// img
					const width = this.decimal(this.easeOut(widthFrom, item.width, time, this.options.duration), 2);
					const height = this.decimal(this.easeOut(heightFrom, item.height, time, this.options.duration), 2);
					const x = this.decimal(this.easeOut(xFrom, item.x, time, this.options.duration), 2);
					const y = this.decimal(this.easeOut(yFrom, item.y, time, this.options.duration), 2);
					item.element.style.width = width + 'px';
					item.element.style.height = height + 'px';
					item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
				}, this.options.duration);
			}
			this.bgOpacity = 1;
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		}
	}
	/**
	 * 处理惯性滚动 300ms
	 */
	NonameGallery.prototype.handleInertia = function () {
		const item = this.previewList[this.index];
		const xFrom = this.currentImg.x;
		const yFrom = this.currentImg.y;
		// 简单处理，直接用移动差值*15
		this.currentImg.x += this.diff.x * 15;
		this.currentImg.y += this.diff.y * 15;
		this.handleBoundary();
		const xTo = this.currentImg.x;
		const yTo = this.currentImg.y;
		const duration = 300;
		if (this.options.useTransition) {
			item.element.style.transition = 'transform ' + duration + 'ms ease-out';
			item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0) scale(' + this.currentImg.scale + ')';
		} else {
			this.raf((time) => {
				this.currentImg.x = this.decimal(this.easeOut(xFrom, xTo, time, duration), 2);
				this.currentImg.y = this.decimal(this.easeOut(yFrom, yTo, time, duration), 2);
				item.element.style.transform = 'translate3d(' + this.currentImg.x + 'px, ' + this.currentImg.y + 'px, 0)';
			}, duration);
		}
	}
	/**
	 * 处理wrap滑动
	 * @param {number} lastIndex
	 */
	NonameGallery.prototype.handleWrapSwipe = function (lastIndex) {
		const lastItem = this.previewList[lastIndex];
		const lastImg = {
			width: this.currentImg.width,
			height: this.currentImg.height,
			x: this.currentImg.x,
			y: this.currentImg.y,
			scale: this.currentImg.scale,
			status: this.currentImg.status
		};
		const wrapXFrom = this.wrapX;
		const wrapXTo = this.windowWidth * this.index * -1;
		if (this.options.useTransition) {
			if (lastIndex !== this.index) {
				lastItem.element.style.transition = 'transform ' + this.options.duration + 'ms, opacity ' + this.options.duration + 'ms';
				lastItem.element.style.transform = 'translate3d(' + lastItem.x + 'px, ' + lastItem.y + 'px, 0) scale(1)';
			}
			this.wrap.style.transition = 'transform ' + this.options.duration + 'ms ease-out';
			this.wrap.style.transform = 'translate3d(' + wrapXTo + 'px, 0, 0)';
		} else {
			this.raf((time) => {
				// img
				if (lastIndex !== this.index) {
					const item = this.previewList[lastIndex];
					const width = this.decimal(this.easeOut(lastImg.width, lastItem.width, time, this.options.duration), 2);
					const height = this.decimal(this.easeOut(lastImg.height, lastItem.height, time, this.options.duration), 2);
					const x = this.decimal(this.easeOut(lastImg.x, lastItem.x, time, this.options.duration), 2);
					const y = this.decimal(this.easeOut(lastImg.y, lastItem.y, time, this.options.duration), 2);
					item.element.style.width = width + 'px';
					item.element.style.height = height + 'px';
					item.element.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
				}
				// wrap
				const wrapX = this.decimal(this.easeOut(wrapXFrom, wrapXTo, time, this.options.duration), 2);
				this.wrap.style.transform = 'translate3d(' + wrapX + 'px, 0, 0)';
			}, this.options.duration);
		}
		if (lastIndex !== this.index) {
			lastItem.element.style.cursor = 'zoom-in';
			const item = this.previewList[this.index];
			this.setCurrentImg(item.x, item.y, item.width, item.height, 1, '');
		}
		this.wrapX = wrapXTo;
		this.counter.innerHTML = (this.index + 1) + ' / ' + this.previewList.length;
	}
	/**
	 * 保留n位小数
	 * @param {number} num 
	 * @param {number} n 
	 * @returns 
	 */
	NonameGallery.prototype.decimal = function (num, n) {
		const x = Math.pow(10, n);
		return Math.round(num * x) / x;
	}
	/**
	 * 获取中心点
	 * @param {object} point
	 * @param {object} point2
	 * @returns 
	 */
	NonameGallery.prototype.getCenter = function (point, point2) {
		const x = (point.x + point2.x) / 2;
		const y = (point.y + point2.y) / 2;
		return { x: x, y: y }
	}
	/**
	 * 曲线函数
	 * @param {number} from 
	 * @param {number} to 
	 * @param {number} time 
	 * @param {number} duration 
	 * @returns 
	 */
	NonameGallery.prototype.easeOut = function (from, to, time, duration) {
		const change = to - from;
		return -change * (time /= duration) * (time - 2) + from;
	}
	/**
	 * 动画函数
	 * @param {function} func 
	 * @param {number} duration
	 */
	NonameGallery.prototype.raf = function (func, duration) {
		const self = this;
		let start;
		let count = 0;
		function step(timestamp) {
			if (start === undefined) start = timestamp;
			let time = timestamp - start;
			if (time > duration) {
				time = duration;
				count++;
			}
			if (count <= 1) {
				func(time);
				self.rafId = window.requestAnimationFrame(step);
			}
		}
		this.rafId = window.requestAnimationFrame(step);
	}
	/**
	 * 设置isAnimating
	 */
	NonameGallery.prototype.setIsAnimating = function () {
		this.isAnimating = true;
		setTimeout(() => {
			this.isAnimating = false;
		}, this.options.duration);
	}

	if (typeof define === 'function' && define.amd) {
		define(function () { return NonameGallery; });
	} else if (typeof module === 'object' && typeof exports === 'object') {
		module.exports = NonameGallery;
	} else {
		window.NonameGallery = NonameGallery;
	}
})();