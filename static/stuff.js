
function logResponse(response) {
    if (console && console.log) {
        console.log(response);
    }
}



function iterateOverFriendsParallel(friends, nodes, namesToIds, i, namelinks, fn) {
    if (!friends) {
        alert('Friends couldn\'t be loaded, please reload!');
        return;
    }

    var
        numFriends = friends.length,
        waiting = numFriends,
        loading_text = $("#loading_text");

    loading_text.text('Waiting for ' + (waiting) + '/' + numFriends + ' friends...');

    $.each(friends, function(index, friend) {
        nodes.push({
            'name': friend['name'],
            'id': friend['id'],
            'index': index,
            'group': 1
        });
        namesToIds[friend['name']] = index;
        loading_text.text('Friend ' + (i+1) + '/' + numFriends + ' loading...');

        FB.api('/' + friend['id'] + '/mutualfriends', function(response) {
            $.each(response['data'], function(index, otherfriend) {
                if (friend['id'] < otherfriend['id'])
                    return;
                namelinks.push({
                    'source': friend['name'],
                    'target': otherfriend['name']
                });
            });
            waiting -= 1;
            loading_text.text('Loaded ' + (numFriends-waiting) + '/' + numFriends + ' friends');
            if (waiting == 0) {
                loading_text.remove();
                fn();
            }
        });
    });
}


var built = false;
function buildGraphChart(nodes, namelinks, namesToIds, height, access_token) {
    if (built)
    {
        return;
    }
    built = true;

    var
        main = $("#main");
    main.height(height);
    var
        width = $("#main").width(),
        svg = d3.select("#svg")
        .attr("width", width)
        .attr("height", height)
        .attr("title", "Network")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg"),
        links = [];

    $.each(namelinks, function(index, namelink) {
        var
            sourceId = namesToIds[namelink['source']],
            targetId = namesToIds[namelink['target']];
        if (sourceId && targetId) {
            links.push({
                'source': sourceId,
                'target': targetId,
                'weight': 1
            });
        }
    });

    var color = d3.scale.category20();

    var force = d3.layout.force()
        .charge(-60)
        .linkDistance(20)
        .size([Math.min(width, height),
            Math.min(width, height)]);

    var offsetx = 0;
    if (width>height)
        offsetx = (width-height)/2;
    var offsety = 0;
    if (height>width)
        offsety = (height-width)/2;



    // http://stackoverflow.com/questions/8739072/highlight-selected-node-its-links-and-its-children-in-a-d3-js-force-directed-g
    var linkedByIndex = {};
    links.forEach(function(d) {
        linkedByIndex[d.source + "," + d.target] = 1;
    });


    function neighboring(a, b) {
        if (a==null || b==null)
            return false;
        var ind = a.index + "," + b.index;
        var ind2 = b.index + "," + a.index;
        return linkedByIndex[ind] || linkedByIndex[ind2];
    }


    force
        .nodes(nodes)
        .links(links)
        .start()
        .theta(0.1);

    var selected = null,
        link = svg.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .style("stroke-width", function(d) {
                return Math.sqrt(d.value);
            });

    function setfill() {
        node.style("fill", function(d) {
            if (selected==d)
                return "#AEC7E8";
            if (neighboring(d, selected))
                return "#FF7F0E";
            return color(d.group); });
        link.style("stroke", "#000000");
        link.style("opacity", function(o) {
            return o.source === selected || o.target === selected ? 1.0 : 0.3;
        });
    }

    var node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 4)
        .attr("class", "node")
        .style("stroke", "#fff")
        .style("stroke-width", "1.5px")
        .on("click", function(d,i) {
            window.open('https://facebook.com/' + d['id'], '_blank');
        })
        .on("mouseover", function(d, i) { selected = d;    setfill(); })
        .on("mouseout",  function(d, i) { selected = null; setfill(); })
        .call(force.drag);
    setfill();


    node.append("title")
        .text(function(d) { return d.name; });

    force.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x + offsetx; })
            .attr("y1", function(d) { return d.source.y + offsety; })
            .attr("x2", function(d) { return d.target.x + offsetx; })
            .attr("y2", function(d) { return d.target.y + offsety; });

        node.attr("cx", function(d) { return d.x + offsetx; })
            .attr("cy", function(d) { return d.y + offsety; });
    });

}




function doit(height, attempt, access_token) {


    FB.api('/me/friends', function(response) {

        if (!response['data']) {
            logResponse(attempt);
            logResponse(response);
            if (attempt>10)
                alert('Attempt to load friends failed. This sometimes happens, we\'re still trying to figure out why. We\'ll retry if you press OK.\n\nError message: ' + response);
            doit(height, attempt+1);
            return;
        }

        var nodes = [],
            namelinks = [],
            namesToIds = {};

        iterateOverFriendsParallel(
            response['data'], // .slice(0,50
            nodes,
            namesToIds,
            0,
            namelinks,
            function() {
                buildGraphChart(
                    nodes,
                    namelinks,
                    namesToIds,
                    height,
                    access_token)});
    });

}


function init(fn) {
    window.fbAsyncInit = function() {
        // init the FB JS SDK
        FB.init({
            appId      : '515437155174833', // App ID from the App Dashboard
            channelUrl : '//floating-ridge-2242.herokuapp.com/channel.html', // Channel File for x-domain communication
            status     : true, // check the login status upon init?
            cookie     : true, // set sessions cookies to allow your server to access the session?
            xfbml      : true  // parse XFBML tags on this page?
        });

        FB.login(function(response) {
            if (response.authResponse) {
                var access_token =   FB.getAuthResponse()['accessToken'];

                FB.Canvas.getPageInfo(
                    function(info) {
                        doit(info.clientHeight * 0.9, 1, access_token);
                    });

            } else {
                alert('User cancelled login or did not fully authorize.');
            }
        });
    };

    (function(d, debug){
        var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
        if (d.getElementById(id)) {return;}
        js = d.createElement('script'); js.id = id; js.async = true;
        js.src = "//connect.facebook.net/en_US/all" + (debug ? "/debug" : "") + ".js";
        ref.parentNode.insertBefore(js, ref);
    }(document, /*debug*/ false));
}

$(function() {
    init();
});
