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
    var numFriends = friends.length;
    var waiting = numFriends;

    $("#loading_text").text('Waiting for ' + (waiting) + '/' + numFriends + ' friends...');
    $.each(friends, function(index, friend) {
	nodes.push({'name': friend['name'],
		    'group': 1});
	namesToIds[friend['name']] = index;	
	$("#loading_text").text('Friend ' + (i+1) + '/' + numFriends + ' loading...');
	FB.api('/' + friend['id'] + '/mutualfriends', function(response) {
	    waiting -= 1;
	    $.each(response['data'], function(index, otherfriend) {
		if (friend['id']<otherfriend['id'])
		    return;
		namelinks.push({'source': friend['name'],
				'target': otherfriend['name']});
		$("#loading_text").text('Waiting for ' + (waiting) + '/' + numFriends + ' friends...');
		if (waiting==0) {
		    $("#loading_text").hide();
		    fn();
		}
	    });
	});
    });
}



function buildGraphChart(nodes, namelinks, namesToIds, height) {

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
	.charge(-120)
	.linkDistance(10)
	.size([width, height]);


    force
	.nodes(nodes)
	.links(links)
	.start()
	.theta(0.05);

    var link = svg.selectAll(".link")
	.data(links)
	.enter().append("line")
	.attr("class", "link")
	.style("stroke-width", function(d) { return Math.sqrt(d.value); });

    var node = svg.selectAll(".node")
	.data(nodes)
	.enter().append("circle")
	.attr("class", "node")
	.attr("r", 4)
	.style("fill", function(d) { return color(d.group); })
	.call(force.drag);

    node.append("title")
	.text(function(d) { return d.name; });

    force.on("tick", function() {
	link.attr("x1", function(d) { return d.source.x; })
	    .attr("y1", function(d) { return d.source.y; })
	    .attr("x2", function(d) { return d.target.x; })
	    .attr("y2", function(d) { return d.target.y; });

	node.attr("cx", function(d) { return d.x; })
	    .attr("cy", function(d) { return d.y; });
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