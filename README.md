# noname-gallery
JavaScript image gallery, easy to use, no dependencies.

![demo](https://github.com/18223781723/noname-gallery/blob/main/src/images/demo.gif)

# Demo
Demo: http://nonamegallery.codeman.top

![二维码](https://github.com/18223781723/noname-gallery/blob/main/src/images/qrcode.png)

# Getting Started
In a browser:
```javascript
<link rel="stylesheet" type="text/css" media="screen" href="path/noname-gallery.css">

<script src="path/noname-gallery.js"></script>
```

# Example
```javascript
<div id="imgBox">
    <img src="" alt="">
    <img src="" alt="">
    <img src="" alt="">
    <img src="" alt="">
    <img src="" alt="">
    <img src="" alt="">
</div>

<script>
    const imgBox = document.querySelector('#imgBox);
    const imgList = document.querySelectorAll('#imgBox img');

    // event delegate
    imgBox.addEventListener('click', function (e) {
        if (e.target.tagName === 'IMG') {
            const options = {
                list: [].slice.call(imgList, 0),
                index: [].indexOf.call(e.target.parentNode.children, e.target)
            }
            // init and open gallery
            const gallery = new NonameGallery(options);
            gallery.init();
        }
    });
</script>
```

# Options
| Params | Type | Defaults | Description |
| :---- | :---- | :---- | :---- |
| options | object |  | 配置项 |
| options.list | array | HTMLImageElement[] | 图片列表，必填参数 |
| options.index | number | 0 | 索引 |
| options.fadeInOut | boolean | true | 动画淡入淡出，当缩略图和预览尺寸不匹配时，建议开启 |
| options.useTransform | boolean | true | 使用transform或宽高缩放 |
| options.verticalZoom | boolean | true | 垂直滑动时缩小图片 |
| options.openKeyboard | boolean | false | 开启键盘控制，esc关闭画廊，方向键切换图片 |
| options.zoomToScreenCenter | boolean | false | 将放大区域移动至屏幕中心显示 |
| options.duration | number | 300 | 动画持续时间，单位ms |
| options.minScale | number | 1.5 | 最小放大倍数 |
