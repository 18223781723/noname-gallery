# noname-gallery
JavaScript image gallery, easy to use

# Getting started
In a browser:

	<link rel="stylesheet" type="text/css" media="screen" href="path/noname-gallery.css">

	<script src="path/noname-gallery.js"></script>

# Example
	<div id="imgBox">
        <img src="" alt="">
        <img src="" alt="">
        <img src="" alt="">
        <img src="" alt="">
        <img src="" alt="">
        <img src="" alt="">
    </div>

	<script>
		var imgBox = document.querySelector('#imgBox);
		var imgList = document.querySelectorAll('#imgBox img');

		// delegate event
        imgBox.addEventListener('click', function (e) {
            if (e.target.tagName === 'IMG') {
				var options = {
					list: [].slice.call(imgList, 0),
					index: [].indexOf.call(e.target.parentNode.children, e.target)
				}

                var gallery = new NonameGallery(options);
                gallery.init();
            }
        });
	</script>

# options
| Params | Type | Defaults | Description |
| :---- | :---- | :---- | :---- |
| options | object |  | 配置项 |
| options.list | array | HTMLImageElement[] | 图片列表，必填参数 |
| options.index | number | 0 | 索引 |
| options.showOpacity | boolean | true | 动画淡入淡出，当缩略图和预览尺寸不匹配时，建议开启 |
| options.useTransition | boolean | true | 动画实现方式，默认使用CSS3 transition，使用requestAnimationFrame在部分手机浏览器上会有卡顿 |
| options.verticalZoom | boolean | false | 垂直滑动时缩小图片 |
| options.openKeyboard | boolean | true | 开启键盘控制，esc关闭画廊，方向键切换图片 |
| options.zoomToScreenCenter | boolean | false | 将放大区域移动至屏幕中心显示 |
| options.duration | number | 300 | 动画持续时间，单位ms |
| options.minScale | number | 1.5 | 最小放大倍数 |
