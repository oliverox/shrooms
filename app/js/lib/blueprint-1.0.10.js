/****************************************************************	
 *  BLUEPRINT JS - StubHub Interactive Seatmap API
 *  Designed for desktop and mobile devices
 *	Copyright (c) 2009 - 2013 StubHub, Inc. All rights reserved.
 *	version 1.0.11
*****************************************************************/

(function ($, undefined) {  
	'use strict';

	var mapVisibleWidth, mapVisibleHeight, containerSize, newContainerSize, originalContainerSize, // map dimensions
		prevZoomLevel, zoomLevel,
		sf = 1.00, // current scale factor
		nsf = 1.00, // new scale factor
		px = 0.00, // current mapContainer position x
		py = 0.00, // current mapContainer position y
		tx = 0.00, // dragged mapContainer position x
		ty = 0.00, // dragged mapContainer position y
		deltaX = 0.00, // change in transformation
		deltaY = 0.00, // change in transformation
		dragstartpos = {}, ondragpos = {}, transformOrigin = [0,0],
		$map, $mapContainer, $svgContainer, // cached jQuery elements
		selectedSections = [], availableSections = {}, sectionsByZone = {},
		zoomRatio = 128, mapMaxSize = 4096,
		domainBuffer = 6, domainPtr = 0, domainCount = 0,	// used for parallelizing loading of image tiles
		mousePressed = false, mouseCoord = [0, 0],   // stores the original pointer coordinates on mousepress when dragging map
		hammer, canvas,  // Raphael canvas
		filteredSections = [], isMapFiltered = false, mapReady = false, dragged = false, mapStatic = false,
		cssprefix = "", csstransform = "",
		callbacks = {
			onSectionOver: [],
			onSectionOut: [],
			onSectionBlur: [ function(sectionIds) {
				if (isMapFiltered) { handleFilterSections(filteredSections); }	// always refilter sections upon sectionBlur if user is in filter mode
			}],
			onSectionFocus: [],
			onZoomChange: []
		};

	// default options
	var defaultOptions = function () {
		return {
			nodeId: "0000",
			configId: "0000",
			version: "1",
			eventId: "0000", // passing in the event ID isn't compatible with jqmobi
			token: "0000",
			type: "2d",
			minZoom: 1,
			maxZoom: 24,
			initialZoom: 0,
			initialPosition: 'center',
			autoFetchMetadata: true,
			environment: 'prod',
			imgBaseDomains: ['cache11.stubhubstatic.com', 'cache12.stubhubstatic.com', 'cache13.stubhubstatic.com', 
							 'cache21.stubhubstatic.com', 'cache22.stubhubstatic.com', 'cache23.stubhubstatic.com', 
							 'cache31.stubhubstatic.com', 'cache32.stubhubstatic.com', 'cache33.stubhubstatic.com'],			
			tileBaseUrl: "//{{imgBaseDomains}}/seatmaps/venues/{{nodeId}}/config/{{configId}}/{{version}}/{{type}}/maptiles/",
			metadataUrl: "https://api.stubhub.com/catalog/venues/v1/{{nodeId}}/venueConfig/{{configId}}/2d/metadata?venueConfigVersion={{version}}",
			ticketApiUrl: "//www.stubhub.com/ticketAPI/restSvc/event/",
			inventoryApiUrl: "https://api.stubhub.com/search/inventory/v1/sectionsummary?eventID={{eventId}}",
			useInventoryApi: false,
			useStubHubStyle: true,
			enablePinchToZoom: true,
			enableTouchEvents: true,
			staticMapFallback: true,
			selectSectionsByZone: false,
			multiSelectSection: true,
			onSectionOver: function (evt, section) {},
			onSectionOut: function (evt, section) {},
			onSectionFocus: function (sections) {},	// accepts an array of section ids
			onSectionBlur: function (sections) {}, // accepts an array of section ids
			onZoomChange: function (z) {},
			onMapReady: function (status) {},
			onMapError: function (errCode, errMsg, thisMap) {
				console.log('*onMapError* ' + errCode + ', ' + errMsg);
				if ((errCode == 9) || (errCode == 11)) {
					if (opts.staticMapFallback) {
						mapStatic = true;
						initialize(thisMap);
					}
					else {
						throw new Error(errMsg);
					}
				}
				else if (errCode == 10) {
					getStaticMap();
				}
				else {
					opts.onMapReady(0);
					throw new Error(errMsg);  
				}
			}
		}
	};	
	var opts = defaultOptions();

/*	// Modify $.ajax to use XDomainRequest instead on IE
	if ($.ajaxTransport !== undefined) {
		$.ajaxTransport("+*", function( options, originalOptions, jqXHR ) {
		    if(jQuery.browser.msie && window.XDomainRequest) {
		        var xdr;
		        return {
		            send: function( headers, completeCallback ) {
		                // Use Microsoft XDR
		                xdr = new XDomainRequest();
		                xdr.open("get", options.url);
		                xdr.onload = function() {
		                    if(this.contentType.match(/\/xml/)){
		                        var dom = new ActiveXObject("Microsoft.XMLDOM");
		                        dom.async = false;
		                        dom.loadXML(this.responseText);
		                        completeCallback(200, "success", [dom]);
		                        
		                    }else{
		                        completeCallback(200, "success", [this.responseText]);
		                    }
		                };
		                xdr.ontimeout = function(){
		                    completeCallback(408, "error", ["The request timed out."]);
		                };
		                xdr.onerror = function(){
		                    completeCallback(404, "error", ["The requested resource could not be found."]);
		                };
		                xdr.send();
		          	},
					abort: function() {
		              	if(xdr)xdr.abort();
		          	}
		        };
		    }
		});
	}
*/
	var getStaticMap = function () {
		// make request to get static map url
		$.ajax({
			url: "//publicfeed.stubhub.com/listingCatalog/select/?fq=%2BstubhubDocumentType%3Avenue&version=2.2&start=0&rows=10&fl=venue_image_url&wt=json&omitHeader=true&q=node_id:" + opts.nodeId + "%20AND%20venue_config_id:" + opts.configId+"&json.wrf=?",
			dataType:"jsonp",
			cache:true,
			success: function(data) {
				if (canvas !== undefined) {
					var imgURL = data.response.docs[0].venue_image_url;
					if (!(imgURL.indexOf('http') >= 0)) {
						imgURL = getImageDomain() + imgUrl;
					}
					var myImg = new Image();
					myImg.onload = function () {
						var imgW = myImg.width;
						var imgH = myImg.height;
						var curImg = $("svg").find('image');
						if (curImg.length > 0) {
							curImg[0].href.baseVal = data.response.docs[0].venue_image_url;
						}
						else {
							canvas.image(data.response.docs[0].venue_image_url, 0, 0, (mapMaxSize*imgW/imgH), mapMaxSize);
						}
						handleLoadMetadata({});						
					}
					myImg.onerror = function () {
						// error code 15: error loading static map 
						opts.onMapError.call(null, 15, "ERR15: could not retrieve static map url", $map[0]);
					}
					myImg.src = imgURL;
				}
				else {
					$map.html("<img src='" + data.response.docs[0].venue_image_url + "'/>");
					$map.find('img').css('width', $map.css('width')); // fixes map width within viewport on Android 2.3
				}
			},
			error: function () {
				// error code 15: error loading static map 
				opts.onMapError.call(null, 15, "ERR15: could not retrieve static map url", $map[0]);
			}
		});
	};

	var getJSONP = function (url, data, jsonp, success) {
		$.ajax({
			url: url,
			dataType:"jsonp",
			jsonp:jsonp,
			data: data,
			cache:true,
			contentType:"",
			success: success
		});
	};

    var getMetadata = function () {			// sectionpaths.json is generated from the svg parser script
		$.ajax({
			url: opts.metadataUrl,
			dataType: 'json',
			success: function (data, status) {
				handleLoadMetadata(data);
			},
			error: function (e) {
				// error code 11: error fetching map metadata from api gateway
				opts.onMapError.call(null, 11, "ERR11: error fetching map metadata from api gateway " + opts.metadataUrl, $map[0]);
			},
			beforeSend: function (xhr, settings) { xhr.setRequestHeader('Authorization', 'Bearer ' + opts.token); }
		});
		
    };

    var handleLoadMetadata = function (data) {										// callback function from successful metadata fetch
		if (data instanceof Object) {
			$.fn.blueprint.venueSections = data;
			if (opts.selectSectionsByZone) {										// store sections by zone
				for (var s in $.fn.blueprint.venueSections) {
					if (s !== 'bbox') {
						var z = $.fn.blueprint.venueSections[s].z;
						if (z in sectionsByZone) {
							sectionsByZone[z].push(s);
						}
						else {
							sectionsByZone[z] = [s];
						}
					}
				}
			}
			renderSections();
		}
		else {
			// error code 12: error parsing map metadata
			opts.onMapError.call(null, 12, "ERR12: error parsing map metadata", $map[0]);
		}    	
    }

	var isTouchDevice = function() {
		return !!('ontouchstart' in window) || !!('onmsgesturechange' in window); 
	};


	var isStyleValid = function (style) {											// checks whether style is properly defined with 
		if (style == null) { return false; }										// following mandatory attributes 
		else { 																// 'fill', 'fill-opacity', 'stroke', stroke-width', 'stroke-opacity'
			return (style.hasOwnProperty('fill') && 						
			style.hasOwnProperty('fill-opacity') && 
			style.hasOwnProperty('stroke') && 
			style.hasOwnProperty('stroke-width') && 
			style.hasOwnProperty('stroke-opacity')); 
		}
	};

    var contains = function (array, value) {
		var index = -1,
		  	length = array.length;
		while (++index < length) {
			if (array[index] === value) {
		  		return true;
			}
		}
		return false;
    };

	var objectSize = function(obj) {
	    var size = 0, key;
    	for (key in obj) {
        	if (obj.hasOwnProperty(key)) size++;
    	}
    	return size;
	};

    /* Events on section elements */

    var handleSectionMouseOver = function (evt, el) {
    	if ($.fn.blueprint.venueSections[el.id].state == 'default') {
			el.attr(opts.hoverStyle);
			var bbox = el.getBBox();
		}
		// trigger callbacks for onSectionOver
		triggerCallback('onSectionOver', [evt, el.id]);
		/*for (var c=0; c<callbacks.onSectionOver.length; c++) {
			var callback = callbacks.onSectionOver[c];
			callback.call(this, evt, el);
		}*/
    };

    var handleSectionMouseOut = function (evt) {
    	if ($.fn.blueprint.venueSections[this.id].state == 'default') {
    		this.attr(this.defaultStyle);
    	}
    	// trigger callbacks for onSectionOut
    	triggerCallback('onSectionOut', [evt, this.id]);
    	/*for (var c=0; c<callbacks.onSectionOut.length; c++) {
    		var callback = callbacks.onSectionOut[c];
    		callback.call(this);
    	}*/
    };

    var handleSectionDown = function (el) {											// fired when section is clicked / tapped
    	var state = $.fn.blueprint.venueSections[el.id].state;
    	var s = el.data("section");

    	if (state == 'selected') { 													
    		// if section is already selected, deselect it
	    	el.attr(el.defaultStyle);
	    	$.fn.blueprint.venueSections[el.id].state = "default";
	    	var i = selectedSections.indexOf(s);
	    	selectedSections.splice(i, 1);
		}
		else {																	// section wasn't selected, so select it if it has tickets, 		
			if ($.fn.blueprint.venueSections[el.id].state !== 'filtered') {		// unless it is filtered out
				if (opts.multiSelectSection == false) {
					if (selectedSections.length > 0)
						handleSectionDown(canvas.getById(selectedSections[0]));
				} 
				if ($.fn.blueprint.venueSections[el.id].tix) {
			    	el.attr(opts.selectedStyle);
			    	$.fn.blueprint.venueSections[el.id].state = "selected";
			    	selectedSections.push(s);
			    }
			}
		}    	
    };

    var renderSections = function () {											// render sections on canvas
    	if (!mapStatic) {
			var el;
			for (var section in $.fn.blueprint.venueSections) {
				el = canvas.path($.fn.blueprint.venueSections[section].p);

				if (section === 'bbox') { // exclude bounding box
					el.attr({opacity: 0});
				}
				else {
					/* Draw sections and bind events to them */
					// el.attr({fill: "0-#fff-#f00:20-#000"}); /* GRADIENT EXAMPLE */
					el.id = el.node.id = section;
					// by default draw all sections as unavailable
					$.extend($.fn.blueprint.venueSections[section], {
						state: "unavailable",
						tix: false
					});
					el.data("section", section);

					// default coloring should be the 'noTicketsStyle'
					el.defaultStyle = opts.noTicketsStyle;
					el.attr(el.defaultStyle);

					// bind section mouseout event	
					el.mouseout(handleSectionMouseOut);
				}
			}
		}

		// get map size
		mapVisibleWidth = $map.width();
		mapVisibleHeight = $map.height();

		// set map to zoomlevel 4 first to set originalContainerSize to that level
		var currentZoom = 4
		containerSize = zoomRatio * currentZoom;
		originalContainerSize = containerSize;	
		prevZoomLevel = currentZoom;


	    // set initial zoom if initialZoom is passed (else it will auto-resize the map)
	    if (opts.initialZoom !== 0) {
	    	currentZoom = opts.initialZoom;
	    }
	    else {
			// get optimum zoom level for current map size
			currentZoom = parseFloat(Math.min(mapVisibleHeight, mapVisibleWidth) / zoomRatio);
			(currentZoom == 0) ? currentZoom = 1 : currentZoom;  
		}
		// containerSize = zoomRatio * zoomLevel; // map container is always a square
		// originalContainerSize = containerSize;
    	handleZoomMap(currentZoom);
		canvas.setSize(containerSize, containerSize);	
		handlePositionMap(opts.initialPosition, false, true);


		// only fetch tickets if an event id is passed in as parameter
		if (opts.eventId !== '0000') {
			handleFetchTickets();
		}
		else {
		    // map is ready
		    mapReady = true;
		    opts.onMapReady(1);
		}

    };

    var getImageDomain = function (seed) {
        if (seed) {
              var l = opts.imgBaseDomains.length;
              var _seed = parseInt(seed, 10) % l;
              return opts.imgBaseDomains[_seed];
        }
		var currentBaseDomain = opts.imgBaseDomains[domainPtr];
		domainCount = domainCount + 1;
		if (domainCount == domainBuffer) {
			domainCount = 0;
			domainPtr = domainPtr + 1;
			if (domainPtr == opts.imgBaseDomains.length) {
				domainPtr = 0;
			}
		}
		return currentBaseDomain;
    };

	var constructBkgImageUrl = function (row, col, zoom) {						// alternates through a list of server base domains 
		var currentBaseDomain = getImageDomain();
		return [opts.tileBaseUrl.replace('{{imgBaseDomains}}', currentBaseDomain), zoom, '-', row, '-', col, '.jpg'].join('');
	};

	var handleMouseDown = function (e) {
      	if (e.preventDefault) { e.preventDefault(); }
    	$mapContainer.removeClass('smooth').addClass('hwacc');
    	$svgContainer.addClass('hwacc');
      	mouseCoord[0] = e.pageX; mouseCoord[1] = e.pageY;   // update current mouse coordinates
      	mousePressed = true;
      	return false;
   	};

	var handleMouseUp = function (e) {
		if (e.preventDefault) { e.preventDefault(); }
    	$mapContainer.removeClass('hwacc');
    	$svgContainer.removeClass('hwacc');
		if (dragged == false) {
			if ((e.target.nodeName == 'path') && (e.target.id) && ($.fn.blueprint.venueSections[e.target.id].state == 'unavailable')) { mousePressed = false; dragged = false; return; }
			if ((e.target.nodeName == 'path') && (e.target.id)) {
				var el; 
				var sectionWasSelected = true;
				if (selectedSections.indexOf(e.target.id) >= 0) {
					sectionWasSelected = false;
				}
				if (opts.selectSectionsByZone) {
					var zone = $.fn.blueprint.venueSections[e.target.id].z;
					for (var s=0; s<sectionsByZone[zone].length; s++) {
						el = canvas.getById(sectionsByZone[zone][s]);
						handleSectionDown(el);
					}
				}
				else {
					el = canvas.getById(e.target.id);
					handleSectionDown(el);
				}
				if (sectionWasSelected) {
			    	// trigger callbacks for onSectionFocus
			    	triggerCallback('onSectionFocus', [e.target.id]);
			    	/*for (var c=0; c<callbacks.onSectionFocus.length; c++) {
			    		var callback = callbacks.onSectionFocus[c];
			    		callback.call(this, [e.target.id]);
			    	}*/					
				}
				else {
			    	// trigger callbacks for onSectionBlur
			    	triggerCallback('onSectionBlur', [e.target.id]);
			    	/*for (var c=0; c<callbacks.onSectionBlur.length; c++) {
			    		var callback = callbacks.onSectionBlur[c];
			    		callback.call(this, [e.target.id]);
			    	}*/					
				}
			}
		}
		mousePressed = false;
		dragged = false;
		return;   
	};

	var handleMouseMove = function (e) {
		if (e.preventDefault) { e.preventDefault(); }
		if (mousePressed) {
			dragged = true;
			var delta = [e.pageX - mouseCoord[0], e.pageY - mouseCoord[1]];
			mouseCoord[0] = e.pageX; mouseCoord[1] = e.pageY;
			handleMapPan(e, delta);
		}
		else {
			if ((e.target.nodeName == 'path') && (e.target.id)) {
				var el = canvas.getById(e.target.id);
				handleSectionMouseOver(e, el);
			}
		}
		return false;
	};

	var handleMouseWheel = function (e) {
		if (e.preventDefault) { e.preventDefault(); }
		$map.trigger("scroll", [e]);
		return false;
  	};

  	var handleMapPan = function (e, delta) {
        px += delta[0];
        py += delta[1];
		$mapContainer.css(csstransform, "matrix(" + sf + ", 0, 0, " + sf + ", " + px + ", " + py + ")");
  	};

  	var handleMapScroll = function (e, evt) {
		var delta = [];
		var deltaX = 0;
		var deltaY = 0;
		var eventData;
		var ie = false;
		(evt !== undefined) ? eventData = evt : eventData = e;
		eventData = (eventData.originalEvent !== undefined) ? eventData = eventData.originalEvent : eventData;


		if (eventData.wheelDelta && !eventData.wheelDeltaX) { // IE9
			ie = true;
		}

		if (eventData.wheelDeltaX) { // Chrome/Safari
			deltaX = eventData.wheelDeltaX / 10; 
		  	deltaY = eventData.wheelDeltaY / 10;
		}
		else {
		  delta = eventData.detail * 13; // Mozilla
		  if (eventData.axis == 1) {  // horizontal pan
		    deltaX = -delta;
		  }
		  else {
		    deltaY = -delta;
		  }
		}
		if (ie) return; // do not allow pan with mousewheel in IE browsers
		delta = [deltaX, deltaY];
		handleMapPan(e, delta);
  	};

  	var handleZoomIn = function () {
		handleZoomMap(zoomLevel + 1);
  	};

	var handleZoomOut = function () {
		handleZoomMap(zoomLevel - 1);
	};

	var handleZoomMap = function (newZoomLevel, smooth) {
		if (newZoomLevel < opts.minZoom) newZoomLevel = opts.minZoom;
		if (newZoomLevel > opts.maxZoom) newZoomLevel = opts.maxZoom;

		containerSize = zoomRatio * newZoomLevel;
		originalContainerSize = containerSize;
		sf = parseFloat(containerSize / originalContainerSize);
		var delta = ((zoomRatio * zoomLevel) - containerSize) / 2;
		px += delta; py += delta;
		if (smooth) {
			$mapContainer.addClass('smooth').bind("transitionend webkitTransitionEnd msTransitionEnd oTransitionEnd otransitionend", function() {
				$mapContainer.removeClass('smooth');
			});		
		}
		$mapContainer.css(csstransform, "matrix(" + sf + ", 0, 0, " + sf + ", " + px + ", " + py + ")");
		if (!smooth) {
			$mapContainer.removeClass('smooth');
		}
		canvas.setSize(containerSize, containerSize);

		prevZoomLevel = zoomLevel;
		zoomLevel = newZoomLevel;

		// trigger callbacks for onZoomChange
		triggerCallback('onZoomChange', [zoomLevel]);
		/*for (var c=0; c<callbacks.onZoomChange.length; c++) {
			var callback = callbacks.onZoomChange[c];
			callback.call(this, zoomLevel);
		}*/
		return $map.blueprint;
	};

	var handleResizeMap = function () {
		if ($map.blueprint && mapReady) {
			// get map size
			mapVisibleWidth = $map.width();
			mapVisibleHeight = $map.height();
			// get appropriate zoom level for current map size
			var z = parseFloat(Math.min(mapVisibleHeight, mapVisibleWidth) / zoomRatio);

			if ((z >= opts.minZoom) && (z <= opts.maxZoom)) {
				handleZoomMap(z);
				handlePositionMap('center');
			}
		}
		return $map.blueprint;
	};

	var handlePositionMap = function (action, smooth, force) {
		// repositions the map to one of the following:
		// topleft, top, topright, left, center, right, bottomleft, bottom, bottomright
		mapVisibleWidth = $map.width();
		mapVisibleHeight = $map.height();
		var reposition = {
			topleft: function () {
				px = 0; 
				py = 0;
			},
			top: function () {
				px = (mapVisibleWidth - containerSize) / 2; 
				py = 0; 
			},
			topright: function () {
				px = mapVisibleWidth - containerSize; 
				py = 0; 
			},
			left: function () {
				px = 0; 
				py = (mapVisibleHeight - containerSize) / 2;
			},
			center: function () {
				px = (mapVisibleWidth - containerSize) / 2;
				py = (mapVisibleHeight - containerSize) / 2;
			},
			right: function () {
				px = mapVisibleWidth - containerSize;
				py = (mapVisibleHeight - containerSize) / 2;
			},
			bottomleft: function () {
				px = 0; 
				py = mapVisibleHeight - containerSize;
			},
			bottom: function () {
				px = (mapVisibleWidth - containerSize) / 2;
				py = mapVisibleHeight - containerSize;
			},
			bottomright: function () {
				px = mapVisibleWidth - containerSize;
				py = mapVisibleHeight - containerSize;
			}
		}
		if (force || ($map.blueprint && mapReady)) {
			if (action in reposition) { 
				reposition[action]();
			}
			else {
				opts.onMapError.call(null, 16, 'ERR16: "' + action + '" is not a valid action', $map[0]);
			}
			if (smooth) {
				$mapContainer.addClass('smooth').bind("transitionend webkitTransitionEnd msTransitionEnd oTransitionEnd otransitionend", function() {
					$mapContainer.removeClass('smooth hwacc');
			    	$svgContainer.removeClass('hwacc');
				});
			}
	    	$mapContainer.addClass('hwacc');
	    	$svgContainer.addClass('hwacc');
        	$mapContainer.css(csstransform, 'matrix(' + sf + ', 0, 0, ' + sf + ', ' + px + ', ' + py + ')');
			if (!smooth) {
				$mapContainer.removeClass('smooth hwacc');
		    	$svgContainer.removeClass('hwacc');
		    }
		}
	};

	var handleCenterSection = function(sid, smooth, horizontalOnly, verticalOnly) {
		var s = canvas.getById(sid);
		mapVisibleWidth = $map.width();
		mapVisibleHeight = $map.height();
		if (s) {
			var bbox = s.getBBox();
			var x = (bbox.x + (bbox.width / 2));
			var y = (bbox.y + (bbox.height / 2));
			var npx = (mapVisibleWidth / 2) - (x * containerSize / mapMaxSize);
			var npy = (mapVisibleHeight / 2) - (y * containerSize / mapMaxSize);

			if (horizontalOnly) {
				npy = py;
			}
			if (verticalOnly) {
				npx = px;
			}

			px = npx;
			py = npy;

			if (smooth) {
				$mapContainer.addClass('smooth').bind("transitionend webkitTransitionEnd msTransitionEnd oTransitionEnd otransitionend", function() {
					$mapContainer.removeClass('smooth hwacc');
			    	$svgContainer.removeClass('hwacc');
				});
			}
	    	$mapContainer.addClass('hwacc');
	    	$svgContainer.addClass('hwacc');
			$mapContainer.css(csstransform, "matrix(" + sf + ", 0, 0, " + sf + ", " + px + ", " + py + ")");
			if (!smooth) {
				$mapContainer.removeClass('smooth hwacc');
		    	$svgContainer.removeClass('hwacc');
		    }
		}
		return $map.blueprint;
	};

	var handleFocusSections = function (sectionIds) {									// selects a section or array of sections
		if ($map.blueprint && mapReady) {
			if (sectionIds !== null) {
				for (var i = 0; i < sectionIds.length; i++) {
					var el = canvas.getById(sectionIds[i]);
					if ((el !== null) && ($.fn.blueprint.venueSections[sectionIds[i]].state == "default")) {
						handleSectionDown(el);
					}
				}
			}
			// trigger callbacks for onSectionFocus
			triggerCallback('onSectionFocus', [sectionIds]);
	    	/*for (var c=0; c<callbacks.onSectionFocus.length; c++) {
	    		var callback = callbacks.onSectionFocus[c];
	    		callback.call(this, sectionIds);
	    	}*/
		}
		return $map.blueprint;
	};

	var handleBlurSections = function (sectionIds) {									// deselects a section or array of sections
		if ($map.blueprint && mapReady) {
			if (sectionIds !== null) {
				for (var i = 0; i < sectionIds.length; i++) {
					var el = canvas.getById(sectionIds[i]);
					if ((el !== null) && ($.fn.blueprint.venueSections[sectionIds[i]].state == 'selected')) {
						handleSectionDown(el);
					}
				}
			}
	    	// trigger callbacks for onSectionBlur
	    	triggerCallback('onSectionBlur', [sectionIds]);
	    	/*for (var c=0; c<callbacks.onSectionBlur.length; c++) {
	    		var callback = callbacks.onSectionBlur[c];
	    		callback.call(this, sectionIds);
	    	}*/
		}
		return $map.blueprint;
	};

    var handleFetchTickets = function () { 												// fetch ticket listing from stubhub ticketAPI
		if (opts.useInventoryApi) {	// using inventory API
			$.ajax({
				url: opts.inventoryApiUrl.replace("{{eventId}}", opts.eventId),
				dataType: 'json',
				success: function (data, status) {
				    // map is ready
				    mapReady = true;

					for (var s=0; s<data.section.length; s++) {
						var sectionItem = data.section[s];
						handleStyleSectionWith(sectionItem.sectionId, {
							'fill': (opts.useStubHubStyle)? $.fn.blueprint.venueSections[sectionItem.sectionId].c : opts.defaultStyle['fill'],
							'fill-opacity': opts.defaultStyle['fill-opacity'],
							'stroke': opts.defaultStyle['stroke'],
							'stroke-opacity': opts.defaultStyle['stroke-opacity'],
							'stroke-width' : opts.defaultStyle['stroke-width']		    					
		    			});
						$.extend($.fn.blueprint.venueSections[sectionItem.sectionId], {
							mnp: sectionItem.minTicketPrice,
							mxp: sectionItem.maxTicketPrice,
							mxq: sectionItem.maxTicketQuantity,
							mnq: sectionItem.minTicketQuantity,
							tix: true,
							state: "default" 
						});
					}
				    opts.onMapReady(1);

				},
				error: function () {
					// error code 14: error fetching data from inventory api
					opts.onMapError.call(null, 14, "ERR14: error fetching data from inventory api", $map[0]);
				},
				beforeSend: function (xhr, settings) { xhr.setRequestHeader('Authorization', 'Bearer ' + opts.token); }
			});

		}

		else {	// using ticket API
	        var ts = new Date().getTime();
	        var queryString = "_jsonp=?&amp;ts="+ts;
			var url = opts.ticketApiUrl+ opts.eventId + "/sort/price/0";
	        getJSONP(url, queryString, "_jsonp", function (data) {
			    // map is ready
			    mapReady = true;

	        	var ticketList;
	        	var el;
	        	if (data.eventTicketListing.eventTicket == undefined) {
	    		    ticketList = [];
	    		} 
	    		else {
	    		    ticketList = data.eventTicketListing.eventTicket;
	    		};
	    		for (var i=0; i<ticketList.length; i++) {
	    			var ticketListItem = ticketList[i];
	    			if (ticketListItem.vi !== null) {
		    			if ((ticketListItem.vi in availableSections) == false) {
		    				$.extend($.fn.blueprint.venueSections[ticketListItem.vi], {
		    					mnp: ticketListItem.cp,
		    					mxp: ticketListItem.cp,
		    					mxq: ticketListItem.qt,
		    					mnq: 1,		// store 1 as minTicketQuantity
		    					tix: true,	// section contains tickets
		    					state: "default"
		    				});

		    				handleStyleSectionWith(ticketListItem.vi, {
								'fill': (opts.useStubHubStyle)? $.fn.blueprint.venueSections[ticketListItem.vi].c : opts.defaultStyle['fill'],
								'fill-opacity': opts.defaultStyle['fill-opacity'],
								'stroke': opts.defaultStyle['stroke'],
								'stroke-opacity': opts.defaultStyle['stroke-opacity'],
								'stroke-width' : opts.defaultStyle['stroke-width']		    					
		    				});
			    			availableSections[ticketListItem.vi]=ticketListItem.va;
		    			}
		    			else {
		    				if (ticketListItem.cp < $.fn.blueprint.venueSections[ticketListItem.vi].mnp) {
			    				$.fn.blueprint.venueSections[ticketListItem.vi].mnp = ticketListItem.cp;
		    				}
		    				if (ticketListItem.cp > $.fn.blueprint.venueSections[ticketListItem.vi].mxp) {
		    					$.fn.blueprint.venueSections[ticketListItem.vi].mxp = ticketListItem.cp;
		    				}
		    				$.fn.blueprint.venueSections[ticketListItem.vi].mxq += ticketListItem.qt;
		    			}
		    		}
	    		}
			    opts.onMapReady(1);	    		
	    	});  
		}
    };

	var getCenter = function (el) {													// returns center coordinate of Raphael element el.
		var bbox = el.getBBox();
		return [bbox.x + bbox.width/2.0, bbox.y + bbox.height/2.0];
	};

    var handleStyleSections = function (sectionIds) {							// receives a list of section IDs to style 
		if ($map.blueprint && mapReady) {								// (usually with StubHub default scheme)
	    	if (sectionIds instanceof Array) {
		    	for (var i=0; i<sectionIds.length; i++) {
					if ((sectionIds[i]) && ((sectionIds[i] in availableSections) == false) && ($.fn.blueprint.venueSections[sectionIds[i]])) {
						var el = canvas.getById(sectionIds[i]);
						el.defaultStyle = {
							'fill': ((opts.useStubHubStyle) && ($.fn.blueprint.venueSections[sectionIds[i]])) ? $.fn.blueprint.venueSections[sectionIds[i]].c : opts.defaultStyle['fill'],
							'fill-opacity': opts.defaultStyle['fill-opacity'],
							'stroke': opts.defaultStyle['stroke'],
							'stroke-opacity': opts.defaultStyle['stroke-opacity'],
							'stroke-width' : opts.defaultStyle['stroke-width']
						};

	    				$.extend($.fn.blueprint.venueSections[sectionIds[i]], {
	    					tix: true,	// section contains tickets
	    					state: "default"
	    				});
						el.attr(el.defaultStyle);
			    		availableSections[sectionIds[i].vi]=1;
					}
				}
			}
		}
		return $map.blueprint;
	};

    var handleStyleSectionWith = function (sectionId, style) {						// receives a section IDs to style using passed style
		if ($map.blueprint && mapReady) {
	    	if ((sectionId !== null) && (isStyleValid(style))) { 
				var el = canvas.getById(sectionId);
				if (el !== null) {
					el.defaultStyle = style;
					el.attr(el.defaultStyle);
				}
			}
		}
		return $map.blueprint;
    };

    var handleFilterSections = function (sectionIds) {							// will color sections passed in sectionIds and disable others
 		if ($map.blueprint && mapReady) {
			if (sectionIds !== null) {
				for (var section in $.fn.blueprint.venueSections) {
					if ((section == 'bbox') || (section == '') || (section == undefined)) continue;
					var el = canvas.getById(section);
					if (contains(sectionIds, section)) {
						if ($.fn.blueprint.venueSections[section].state !== "selected") {
							$.fn.blueprint.venueSections[section].state = "default";
							el.attr(el.defaultStyle);
						}
					}
					else {
						if ($.fn.blueprint.venueSections[section].state !== "selected") {
							$.fn.blueprint.venueSections[section].state = "filtered";
							el.attr(opts.filteredOutStyle);
						}
					}
					filteredSections = sectionIds;
					isMapFiltered = true;
				}
			}
		}
		return $map.blueprint;
    };


    var handleResetMap = function () {											// unselect all selected sections and resets filtered sections
		if ($map.blueprint && mapReady) {
			var sectionIds = selectedSections.slice();
			handleBlurSections(sectionIds);

			for (var section in $.fn.blueprint.venueSections) {
				if ((section == 'bbox') || (section == '') || (section == undefined)) continue;
				var el = canvas.getById(section);
				// filter section in
				if ($.fn.blueprint.venueSections[section].state !== "unavailable") {
					$.fn.blueprint.venueSections[section].state = "default";
				}
				el.attr(el.defaultStyle);
			}
			selectedSections = [];
			filteredSections = [];
			isMapFiltered = false;
		}
		return $map.blueprint;
	};

	 var handleToggle2d3d = function (newOpts) {
    	if (newOpts == undefined) {
    		newOpts = {};
    	}
    	var oldType = opts.type;
    	var newType;
    	(oldType == "2d") ? newType = "3d" : newType = "2d";

    	newOpts.type = newType;
    	newOpts.tileBaseUrl = opts.tileBaseUrl.replace(oldType, newType);
    	newOpts.metadataUrl = opts.metadataUrl.replace(oldType, newType);

    	$.extend(opts, newOpts);

    	//clear the canvas & flush cache
    	canvas.clear();

    	// auto reload new svg
    	if (opts.autoFetchMetadata) {
    		getMetadata();
    	}
		return $map.blueprint;
    };

    var getMapCenterCoords = function () {
    	var t = $mapContainer.css(csstransform).split(',');
    	var cx = (parseFloat(t[4]) + containerSize) / 2;	
    	var cy = (parseFloat(t[5]) + containerSize) / 2;
    	return [cx, cy];
    };

    var triggerCallback = function (callbackName, callbackArgs) {
    	if (callbackName in callbacks) {
			for (var c=0; c<callbacks[callbackName].length; c++) {
				var callback = callbacks[callbackName][c];
				callback.apply(undefined, callbackArgs);
			}	
		}
    };

	var bindEvents = function () {
		$map.bind({
			'mousedown' 			: handleMouseDown,
			'mouseup'   			: handleMouseUp,
			'mousemove' 			: handleMouseMove,
			'mousewheel'			: handleMouseWheel,
			'scroll'				: handleMapScroll
			// 'pan'					: handleMapPan,
		});

		// add touch events only if on mobile device
		if (isTouchDevice()) {

			// unbind mouse & tap events
			$map.unbind('mousedown').unbind('mouseup').unbind('mousemove').unbind('mousewheel');

			if (opts.enableTouchEvents) {
				// add touch events
			    hammer.ontap = function (ev) {
					var el = ev.originalEvent.target; 
					if ((ev.originalEvent.target.nodeName == 'path') && (ev.originalEvent.target.id)) {
						var sectionWasSelected = true;
						if (selectedSections.indexOf(ev.originalEvent.target.id) >= 0) {
							sectionWasSelected = false;
						}				
						if (opts.selectSectionsByZone) {
							var zone = $.fn.blueprint.venueSections[ev.originalEvent.target.id].z;
							for (var s=0; s<sectionsByZone[zone].length; s++) {
								el = canvas.getById(sectionsByZone[zone][s]);
								handleSectionDown(el);
							}
						}
						else {
							el = canvas.getById(ev.originalEvent.target.id);
							handleSectionDown(el);
							var bbox = el.getBBox();
						}
						if (sectionWasSelected) {
							$mapContainer.removeClass('smooth');
					    	// trigger callbacks for onSectionFocus
					    	triggerCallback('onSectionFocus', [ev.originalEvent.target.id]);
					    	/*for (var c=0; c<callbacks.onSectionFocus.length; c++) {
					    		var callback = callbacks.onSectionFocus[c];
					    		callback.call(this, [ev.originalEvent.target.id]);
					    	}*/					
						}
						else {
							$mapContainer.removeClass('smooth');
					    	// trigger callbacks for onSectionBlur
					    	triggerCallback('onSectionBlur', [ev.originalEvent.target.id]);
					    	/*for (var c=0; c<callbacks.onSectionBlur.length; c++) {
					    		var callback = callbacks.onSectionBlur[c];
					    		callback.call(this, [ev.originalEvent.target.id]);
					    	}*/					
						}
					}
			    };

			    hammer.ondoubletap = function (ev) {
			    	handleZoomIn();
			    };

			    hammer.ondragstart = function (ev) {
			    	$mapContainer.removeClass('smooth').addClass('hwacc');
			    	$svgContainer.addClass('hwacc');
			      	dragstartpos = ev.position;
			    };

			    hammer.ondrag = function(ev) {
			    	ondragpos = ev.position;
			        tx = px; ty = py;
			        var touches = ev.originalEvent.touches || [ev.originalEvent];
			        if (touches.length == 1) {
			            var $target = $(touches[0].target);
			            if ($target) {
							tx += ondragpos.x - dragstartpos.x;
			            	ty += ondragpos.y - dragstartpos.y; 
			            	$mapContainer.css(csstransform, 'matrix(' + sf + ', 0, 0, ' + sf + ', ' + tx + ', ' + ty + ')');
			            }		        	
			        }
			    };

			    hammer.ondragend = function (ev) {
			      	$mapContainer.removeClass('smooth hwacc');
			      	$svgContainer.removeClass('hwacc');
					px = tx; py = ty;
			    }

			    if (opts.enablePinchToZoom) {

					hammer.ontransformstart = function (ev) {
				      	transformOrigin[0] = ((ev.originalEvent.touches[0].pageX + ev.originalEvent.touches[1].pageX) / 2) - $map.offset().left;
				      	transformOrigin[1] = ((ev.originalEvent.touches[0].pageY + ev.originalEvent.touches[1].pageY) / 2) - $map.offset().top;
					};

					hammer.ontransform = function (ev) {
						nsf = ev.scale * sf;
						
						newContainerSize = originalContainerSize * nsf;
						if ((newContainerSize / zoomRatio) < opts.minZoom) {
							newContainerSize = zoomRatio * opts.minZoom;
							nsf = parseFloat(newContainerSize / originalContainerSize);
						}

						if ((newContainerSize / zoomRatio) > opts.maxZoom) {
							newContainerSize = zoomRatio * opts.maxZoom;
							nsf = parseFloat(newContainerSize / originalContainerSize);
						}						
						deltaX = (transformOrigin[0] - px) * (1 - (newContainerSize / containerSize));
						deltaY = (transformOrigin[1] - py) * (1 - (newContainerSize / containerSize));
						$mapContainer.css(csstransform, "matrix(" + nsf + ", 0, 0, " + nsf + ", " + (px+deltaX) + ", " + (py+deltaY) + ")");
						// $mapContainer.css(csstransform, "matrix(1, 0, 0, 1, " + (px+deltaX) + ", " + (py+deltaY) + ")");
						// canvas.setSize(newContainerSize, newContainerSize);
					};

					hammer.ontransformend = function(ev) {
						sf = nsf;
						px += deltaX; py += deltaY;
						containerSize = newContainerSize;
						prevZoomLevel = zoomLevel;
						zoomLevel = containerSize / zoomRatio;
						// trigger callbacks for onZoomChange
						triggerCallback('onZoomChange', [zoomLevel]);
						/*for (var c=0; c<callbacks.onZoomChange.length; c++) {
							var callback = callbacks.onZoomChange[c];
							callback.call(this, zoomLevel);
						}*/
					};
				}
			}
		}
	};

	var initialize = function (mapEl) {
		$map = $(mapEl).empty().unbind();

		if (typeof window.Raphael !== undefined && window.Raphael && (Raphael.svg || Raphael.vml)) {

			mapReady = false;
			selectedSections = [];

			// create div container for tiles & svg
			$mapContainer = $("<div id='mapcontainer'></div>");
			$svgContainer = $("<div id='svgcontainer'></div>");
			$mapContainer.append($svgContainer).append("<div class='copyright'></div>");
			$map.append($mapContainer);

			// init & set raphael canvas size
			canvas = Raphael($svgContainer[0]).setSize(containerSize, containerSize).setViewBox(0, 0, mapMaxSize, mapMaxSize);
			$map.find('.copyright').html('blueprint.js - Copyright &copy; 2009 - 2013 StubHub, Inc. All rights reserved.');

			// add hammer touch
			if (hammer == undefined) {
				hammer = new Hammer($map[0], {
			        scale_treshold: 0,
			        drag_min_distance: 1,
			        drag_horizontal: true,
			        drag_vertical: true,
			        transform: true,
			        hold: false,
			        swipe: false,
			        prevent_default: true,
			        css_hacks: false,
			        tap_max_interval: 150
			    });
			}

			// add events to map
			bindEvents();

			if (!mapStatic) { 
				canvas.image(constructBkgImageUrl(0, 0, 8), 0, 0, mapMaxSize, mapMaxSize);

				// get section svg paths & render sections on map
				if (opts.autoFetchMetadata) {
					getMetadata();
				}
			}
			else {
				getStaticMap();
			}

			// register and initialize extensions
			if (!mapStatic) {
				if (objectSize(opts.extensions) > 0) {
					$.fn.blueprint.extensions = {};
					for (var m in opts.extensions) {
						$.extend($.fn.blueprint.extensions, opts.extensions);
						$map.blueprint[m]($map, opts.extensions[m]);
					}
				}
			}
		}
		else {
			mapStatic = true;
			// error code 10: browser doesn't support SVG or VML
			opts.onMapError.call(null, 10, "ERR10: browser doesn't support svg or vml", $map[0]);
		}
	};

	$.fn.blueprint = function (options) {
		if (options.environment === 'dev') {
			options.tileBaseUrl = "http://m.srwd21.com/seatmaps/venues/{{nodeId}}/config/{{configId}}/{{version}}/{{type}}/maptiles/";
			options.metadataUrl = "https://sandbox.api.stubhub.com/catalog/venues/v1/{{nodeId}}/venueConfig/{{configId}}/2d/metadata?venueConfigVersion={{version}}";
			options.token = "L4IrNcgyg9OWWYOHsjy2ghA_EsIa";
		}
		
		opts = $.extend(defaultOptions(), options);

		opts.defaultStyle = $.extend({
			'fill': "#999",
			'fill-opacity': .3,
			'stroke': '#000',
			'stroke-width': 0,
			'stroke-opacity': 0
		}, opts.defaultStyle);

		opts.hoverStyle = $.extend({
			//fill: "0-#fff-#f00:20-#000", GRADIENT EXAMPLE
			'fill': "#ff9900",
			'fill-opacity': .8,
			'stroke': '#333333',
			'stroke-width': 1,
			'stroke-opacity': .5
		}, opts.hoverStyle);

		opts.selectedStyle = $.extend({
			'fill': "#333333",
			'fill-opacity': .1,
			'stroke': '#333333',
			'stroke-width': 2,
			'stroke-opacity': 1
		}, opts.selectedStyle);

		opts.noTicketsStyle = $.extend({
			'fill': "#ffffff",
			'fill-opacity': 0.7,
			'stoke': '#fff',
			'stroke-width': 0,
			'stroke-opacity': 0
		}, opts.noTicketsStyle);

		opts.filteredOutStyle = $.extend({
			'fill': "#ffffff",
			'fill-opacity': 0.7,
			'stoke': '#fff',
			'stroke-width': 0,
			'stroke-opacity': 0
		}, opts.filterOutStyle);

		// register callbacks
		callbacks.onSectionOver.push(opts.onSectionOver);
		callbacks.onSectionOut.push(opts.onSectionOut);
		callbacks.onSectionFocus.push(opts.onSectionFocus);
		callbacks.onSectionBlur.push(opts.onSectionBlur);
		callbacks.onZoomChange.push(opts.onZoomChange);


		return this.each(function() {
			var thisMap = this;

			// fix css prefix
			if (thisMap.style.KhtmlTransform !== undefined) cssprefix = "-khtml-";
			if (thisMap.style.WebkitTransform !== undefined) cssprefix = "-webkit-";
			if (thisMap.style.MozTransform !== undefined) cssprefix = "-moz-";
			if (thisMap.style.OTransform !== undefined) cssprefix = "-o-";
			if (thisMap.style.msTransform !== undefined) cssprefix = "ms-";

	        csstransform = cssprefix + 'transform';


			if (((opts.nodeId == "0000") || (opts.configId == "0000")) && (opts.eventId !== "0000")) {
				// make ajax call to retrieve node id and config id
				$.ajax({
					url: "http://publicfeed.stubhub.com/listingCatalog/select/?fq=%2BstubhubDocumentType%3Aevent&start=0&rows=1&fl=venue_config_id%2C+geography_parent&qt=standard&omitHeader=true&wt=json&q=id:"+opts.eventId+"&json.wrf=?",
					dataType:"jsonp",
					cache:true,
					success: function(data) { 
						$.extend(opts, {
							nodeId: data.response.docs[0].geography_parent,
							configId: data.response.docs[0].venue_config_id
						});
						opts.tileBaseUrl = opts.tileBaseUrl.replace("{{nodeId}}", opts.nodeId).replace("{{configId}}", opts.configId).replace("{{type}}", opts.type).replace("{{version}}", opts.version);
						opts.metadataUrl = opts.metadataUrl.replace("{{nodeId}}", opts.nodeId).replace("{{configId}}", opts.configId).replace("{{type}}", opts.type).replace("{{version}}", opts.version);
						initialize(thisMap);
					},
					error: function () {
						opts.onMapError.call(null, 13, "ERR13: node id and config id couldn't be retrieved for event " + opts.eventId, thisMap);
					}
				});
			}
			else {

				if ((opts.nodeId !== "0000") && (opts.configId !== "0000")) {

					opts.tileBaseUrl = opts.tileBaseUrl.replace("{{nodeId}}", opts.nodeId).replace("{{configId}}", opts.configId).replace("{{type}}", opts.type).replace("{{version}}", opts.version);
					opts.metadataUrl = opts.metadataUrl.replace("{{nodeId}}", opts.nodeId).replace("{{configId}}", opts.configId).replace("{{type}}", opts.type).replace("{{version}}", opts.version);

					// check if interactive map is available
					var ti = $("<img/>"); 
					ti[0].onload = function() { initialize(thisMap); }
					ti[0].onerror = function() { opts.onMapError.call(null, 9, 'ERR9: No interactive map found.', thisMap); }
					ti[0].src = constructBkgImageUrl(0, 0, 1);
				}
				else {
					// error code 15: error loading static map 
					opts.onMapError.call(null, 15, "ERR15: could not retrieve static map url", thisMap);					
				}
			}
		});		
	};

	// public methods
	// ...

	$.fn.blueprint.canvas = function () {
		return canvas;
	};

	$.fn.blueprint.getSection = function (sid) {
		return canvas.getById(sid);
	};

	$.fn.blueprint.getSectionData = function (sid) {
		return $.fn.blueprint.venueSections[sid];
	};

	$.fn.blueprint.centerSection = function (sid, smooth, horizontalOnly, verticalOnly) {
		/* centers the section within the map viewport */
		(smooth) ? smooth = true : smooth = false;
		(horizontalOnly) ? horizontalOnly = true : horizontalOnly = false;
		(verticalOnly) ? verticalOnly = true : verticalOnly = false;
		return handleCenterSection(sid, smooth, horizontalOnly, verticalOnly);
	};

	$.fn.blueprint.styleSections = function (sectionIds) {
    	/* receives a list of section IDs to style (usually with StubHub default color scheme) */
		return handleStyleSections(sectionIds);
	};

	$.fn.blueprint.styleSection = function (sectionId, style) {
		/* pass in a style to paint section with */
		return handleStyleSectionWith(sectionId, style);
	};

	$.fn.blueprint.focusSection = function (sid) {
		/* selects section */
		return $.fn.blueprint.focusSections([sid]);
	};

	$.fn.blueprint.focusSections = function (sectionIds) {
		/* pass in an array of section ids to be selected on map */
		if (sectionIds instanceof Array) {
			return handleFocusSections(sectionIds);
		}
		return $map.blueprint;
	};

	$.fn.blueprint.blurSection = function (sid) {
		/* deselect section */
		if (sid !== null) {
			return $.fn.blueprint.blurSections([sid]);
		}
		else {
			return false;
		}
	};

	$.fn.blueprint.blurSections = function (sectionIds) {
		/* pass in an array of section ids to be deselected on map */
		if (sectionIds instanceof Array) {
			return handleBlurSections(sectionIds);
		}
		return $map.blueprint;
	};

	$.fn.blueprint.filterSections = function (sectionIds) {
		/* will filter the map with the array of sectionIds (the rest will be filtered out) */
		if (sectionIds instanceof Array) {
			return handleFilterSections(sectionIds);
		}
		return $map.blueprint;
	};

	$.fn.blueprint.zoomIn = function () {
		/* zooms in map */
		return handleZoomIn();
	}

	$.fn.blueprint.zoomOut = function () {
		/* zooms out map */
		return handleZoomOut();
	}

	$.fn.blueprint.zoomMap = function (z, smooth) {
		/* sets map to a specific zoom level */
		if (smooth == undefined) { smooth = false; }
		return handleZoomMap(z, smooth);
	};

	$.fn.blueprint.getType = function () {
		/* returns current map type (2d or 3d) */
		return opts.type;
	};

    $.fn.blueprint.getMapOffset = function () {
    	/* returns the map offset */
    	return {x: px, y: py};
    };

	$.fn.blueprint.resizeMap = function () {
		/* adjusts map to the optimum size available within container */
		return handleResizeMap();
	};

	$.fn.blueprint.positionMap = function (position, smooth) {
		/* sets the position of the map within the map viewport */
		return handlePositionMap(position, smooth);
	};

	$.fn.blueprint.centerMap = function (smooth, horizontalOnly, verticalOnly) {
		/* centers map within container */
		return handlePositionMap('center', smooth);
	};

	$.fn.blueprint.resetMap = function () {
		/* resets all selected sections on map */
		return handleResetMap();
	};

    $.fn.blueprint.destroyMap = function () {
    	/* removes the map from the DOM and clears out all binded events */
		$map.unbind().empty();
		selectedSections = [], availableSections = {}, filteredSections = [], mapStatic = false;
		return $map.blueprint;
    };

    $.fn.blueprint.getCurrentZoom = function () {
    	/* returns current zoom level */
    	return zoomLevel;
    };

    $.fn.blueprint.getSelectedSections = function () {
    	/* returns all currently selected section ids */
    	return selectedSections;
    };

    $.fn.blueprint.getSectionsByZone = function () {
    	/* returns sections by zone */
    	return sectionsByZone;
    };

    $.fn.blueprint.getAllSections = function () {
    	/* returns all available sections */
    	var s = $.fn.blueprint.venueSections;
    	delete s.bbox;
    	return s;
    };

    $.fn.blueprint.getViewFromSectionUrl = function (sid, size) {
    	/* returns the url to the view from section */
    	if (size == undefined) { size = '195x106'; }
    	if (sid == undefined) { return false; }
    	return '//' + getImageDomain(sid) + "/sectionviews/venues/" + opts.nodeId + "/config/" + opts.configId + "/" + size + "/" + sid + ".jpg";
    };

    $.fn.blueprint.getMapSize = function () {
    	/* returns current map size (at that zoom level) */
    	return containerSize;
    };

    $.fn.blueprint.isMapStatic = function () {
    	/* returns whether map is static or not */
    	return mapStatic;
    };

    $.fn.blueprint.isMapReady = function () {
    	/* returns true if map is ready to be manipulated */
    	return mapReady;
    };

    $.fn.blueprint.registerCallback = function (name, callback) {
    	/* register a callback event */
		callbacks[name].push(callback);
		return $map.blueprint;
    };

    $.fn.blueprint.getAllExtensions = function () {
    	/* returns an object of registered extensions */
    	return opts.extensions;
    };

})( ((typeof jq) !== "undefined") ? jq : jQuery );