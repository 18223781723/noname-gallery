# noname-gallery
JavaScript gallery,easy to use

# Getting started
In a browser:

	<link rel="stylesheet" type="text/css" media="screen" href="path/noname-gallery.css">

	<script src="path/noname-gallery.js"></script>

# usage
	var gallery = new NonameGallerry(options);
	gallery.init();

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

                const gallery = new NonameGallery(options);
                gallery.init();
            }
        });
	</script>