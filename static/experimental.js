
// http://stackoverflow.com/questions/6850276/how-to-convert-dataurl-to-file-object-in-javascript
function dataURItoBlob(dataURI, callback) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    var bb = new BlobBuilder();
    bb.append(ab);
    return bb.getBlob(mimeString);
}

function postDataUrl(someDataUrl) {
    var blob = dataURItoBlob(someDataUrl);
    var fd = new FormData(document.forms[0]);
    var xhr = new XMLHttpRequest();

    fd.append("file", blob);
    xhr.open('POST', '/', true);
    xhr.send(fd);
}

function dumpImage() {
    var html = d3.select("svg")
        .attr("title", "test2")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .style("background-color", "#FFF")
        .node().parentNode.innerHTML;

    var canvas = document.getElementById("myCanvas");
    canvg(canvas, svgfix(html));
    var dataURL = canvas.toDataURL();//.replace("image/png", "image/octet-stream");

    var wallPost = {
        message : "testing...",
        picture: dataURL
    };

    var access_token =   FB.getAuthResponse()['accessToken'];


    FB.ui(
        {
            method: 'feed',
            name: 'Share network',
            link: 'https://www.facebook.com/appcenter/networkfriends',
            //picture: dataURL,
            caption: 'My Social Network',
            description: 'I am browsing my friendsocial network using the Social Network Navigator!'
        },
        function(response) {
            logResponse(response);
            if (response && response.post_id) {
                alert('Post was published.');
            } else {
                alert('Post was not published.');
            }
        }
    );

    /*

     $.getJSON('https://graph.facebook.com//me/photos?access_token='+access_token + '&callback=?',
     { url: dataURL,
     access_token: access_token },
     function(response) {
     if (!response || response.error) {
     alert('Error occured: ' + JSON.stringify(response.error));
     } else {
     alert('Post ID: ' + response);
     }
     });*/


    /*
     FB.api('/me/photos?access_token='+access_token,
     'post',
     { url: dataURL,
     access_token: access_token },
     function(response) {
     if (!response || response.error) {
     alert('Error occured: ' + JSON.stringify(response.error));
     } else {
     alert('Post ID: ' + response);
     }
     });
     */

    /*
     FB.api('/me/feed', 'post', wallPost , function(response) {
     if (!response || response.error) {
     alert('Error occured');
     logResponse(response);
     } else {
     alert('Post ID: ' + response);
     }
     });
     */

    //document.location.href=dataURL;
}


/*
 function dumpImage() {

 var myCanvas = document.getElementById("myCanvas");
 var svg = document.getElementById("svg");
 var svg_xml = svg.node().parentNode.innerHTML; //(new XMLSerializer).serializeToString(svg);
 var ctx = myCanvas.getContext('2d');
 var img = new Image;
 img.onload = function(){ ctx.drawImage(img,0,0); };

 //var x = utf8_to_b64(svg_xml);
 //img.src = "data:image/svg+xml;base64,"+x;

 logResponse(svg_xml);

 //img.src = "data:image/svg+xml;charset=utf-8,"+svg_xml;
 img.src = "data:image/svg+xml;base64,"+btoa(svg_xml);
 // http://www.nihilogic.dk/labs/canvas2image/
 Canvas2Image.saveAsPNG(myCanvas, 'network.png');
 //logResponse('4');
 logResponse(myCanvas.toDataURL())

 }
 */


//https://developer.mozilla.org/de/docs/DOM/window.btoa
function utf8_to_b64( str ) {
    return window.btoa(unescape(encodeURIComponent( str )));
}

function b64_to_utf8( str ) {
    return decodeURIComponent(escape(window.atob( str )));
}
