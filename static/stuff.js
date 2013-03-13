function log(s) {
    //if (console)
//	if (console.log)
	    console.log(s);
}

var numFriends = 0;
function iterateOverFriends(friends, nodes, namesToIds, i, namelinks, fn) {
    if (i==0)
	numFriends = friends.length;
    var friend = friends.pop();
    if (!friend) {
	$("#loading_text").hide();
	fn();
	return;
    }

    nodes.push({'name': friend['name'],
		'id': friend['id'],
		'group': 1});
    namesToIds[friend['name']] = i;
    FB.api('/' + friend['id'] + '/mutualfriends', function(response) {
	$("#loading_text").text('Friend ' + (i+1) + '/' + numFriends + ' loading...');
	$.each(response['data'], function(index, otherfriend) {
	    if (friend['id']<otherfriend['id'])
		return;
	    namelinks.push({'source': friend['name'],
			'target': otherfriend['name']})
	});
	iterateOverFriends(friends, nodes, namesToIds, i+1, namelinks, fn);
    });
}


function iterateOverFriendsParallel(friends, nodes, namesToIds, i, namelinks, fn) {
    var waiting = 0;
    if (!friends) {
	alert('Friends couldn\'t be loaded, please reload!');
	return;
    }
    var numFriends = friends.length;
    var waiting = numFriends;

    $("#loading_text").text('Waiting for ' + (waiting) + '/' + numFriends + ' friends...');
    $.each(friends, function(index, friend) {
	nodes.push({'name': friend['name'],
		    'id': friend['id'],
		    'group': 1});
	namesToIds[friend['name']] = index;	
	$("#loading_text").text('Friend ' + (i+1) + '/' + numFriends + ' loading...');
	FB.api('/' + friend['id'] + '/mutualfriends', function(response) {
	    waiting -= 1;
	    console.log('waiting: ', waiting);
	    $.each(response['data'], function(index, otherfriend) {
		if (friend['id']<otherfriend['id'])
		    return;
		namelinks.push({'source': friend['name'],
				'target': otherfriend['name']});
		$("#loading_text").text('Waiting for ' + (waiting) + '/' + numFriends + ' friends...');
		if (waiting==0) {
		    console.log('waiting==0!');
		    $("#loading_text").hide();
		    fn();
		}
	    });
	});
    });
}


var built = false;
function buildGraphChart(nodes, namelinks, namesToIds, height) {
    if (built)
    {
	console.log('already built! this shouldn\'t happen.');
	return;
    }
    built = true;

    var 
    main = $("#main");
    main.height(height);
    var width = $("#main").width();

    svg = d3.select("#main").append("svg")
	.attr("width", width)
	.attr("height", height);


    //glob['namelinks'] = namelinks;
    //glob['namesToIds'] = namesToIds;
    var links = [];
    $.each(namelinks, function(index, namelink) {
	var 
	sourceId = namesToIds[namelink['source']],
	targetId = namesToIds[namelink['target']];	
	if (sourceId && targetId) {
	    links.push({'source': sourceId,
			'target': targetId,
			'weight': 1});
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

    console.log(offsetx, offsety, 'offsets');


    // http://stackoverflow.com/questions/8739072/highlight-selected-node-its-links-and-its-children-in-a-d3-js-force-directed-g
    var linkedByIndex = {};
    links.forEach(function(d) {
	linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });

    function neighboring(a, b) {
	return linkedByIndex[a.index + "," + b.index];
    }    


    force
	.nodes(nodes)
	.links(links)
	.start()
	.theta(0.1);

    var selected = null;
    var opacity = 0.5;

    function fade(opacity) {
        return function(d, i) {
            //fade all elements
            svg.selectAll("circle, line").style("opacity", opacity);

            var associated_links = svg.selectAll("line").filter(function(d) {
                return d.source.index == i || d.target.index == i;
            }).each(function(dLink, iLink) {
                //unfade links and nodes connected to the current node
                d3.select(this).style("opacity", 1);
                //THE FOLLOWING CAUSES: Uncaught TypeError: Cannot call method 'setProperty' of undefined
                d3.select(dLink.source).style("opacity", 1);
                d3.select(dLink.target).style("opacity", 1);
            });
        };
    }

    var link = svg.selectAll(".link")
	.data(links)
	.enter().append("line")
	.attr("class", "link")
	.style("stroke-width", function(d) { return Math.sqrt(d.value); })
	.style("opacity", function(o) {
	    return o.source === selected || o.target === selected ? 1 : opacity;
	});

    var node = svg.selectAll(".node")
	.data(nodes)
	.enter().append("circle")
	.attr("class", "node")
	.attr("r", 4)
	.style("fill", function(d) { return color(d.group); })
	.on("click", function(d,i) { 
	    window.open('https://facebook.com/' + d['id'], '_blank'); 
	})
	.style("opacity", function(d) {
	    return neighboring(selected, d) ? 1 : opacity;
	})
	.on("mouseover", function(d, i) { selected = d; })
	.on("mouseout", function(d, i) {selected = null;})
	.call(force.drag)

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


function doit(height) {
    

    FB.api('/me/friends', function(response) {

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
		    height)});
    });

}


function init(fn) {
    window.fbAsyncInit = function() {
	// init the FB JS SDK
	FB.init({
	    appId      : '515437155174833', // App ID from the App Dashboard
	    channelUrl : '//nicolasneubauer.net/channel.html', // Channel File for x-domain communication
	    status     : true, // check the login status upon init?
	    cookie     : true, // set sessions cookies to allow your server to access the session?
	    xfbml      : true  // parse XFBML tags on this page?
	});

	// Additional initialization code such as adding Event Listeners goes here
	FB.Canvas.getPageInfo(
	    function(info) {
		doit(info.clientHeight * 0.9);
	    });
    };

    // Load the SDK's source Asynchronously
    // Note that the debug version is being actively developed and might 
    // contain some type checks that are overly strict. 
    // Please report such bugs using the bugs tool.
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