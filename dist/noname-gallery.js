; (function () {
	'use strict';
	var NonameGallery = function (options) {
		this.options = Object.assign({}, this.defaults, options);
		this.windowWidth = window.innerWidth;
		this.windowHeight = window.innerHeight;
		this.maxScale = 1.5;
		this.minScale = 0.7;
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
		this.touchstartTime = null;
		this.lastMoveTime = null;
		this.lastTwoFingersTime = null;
	}

	NonameGallery.prototype.defaults = {
		list: [],
		index: 0,
		showOpacity: true,
		zoomToScreenCenter: false,
		verticalZoom: false,
		duration: 300,
		animation: 'transition', // todo
	}
	NonameGallery.prototype.init = function () {

	}
	NonameGallery.prototype.render = function () {

	}


	if (typeof define === 'function' && define.amd) {
		define(function () { return NonameGallery; });
	} else if (typeof module === 'object' && typeof exports === 'object') {
		module.exports = NonameGallery;
	} else {
		window.NonameGallery = NonameGallery;
	}
})();