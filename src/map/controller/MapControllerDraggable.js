FM.MAPController = FM.Class.extend({

    id: '',

    suffix: '',

    _map: '',

    _fenixMap: '',

    _guiController:  {
        overlay : true,
        baselayer: true
    },

    /** Used by the controller **/
    baseLayersMap:    '',    // should be an hashmap (id, layer)
    currentBaseLayer: '', // this is the layer that is currently the baselayer

    layersMap: '',  // HashMap(l.id, l)

    layersMapZIndexes: '', // HashMap(l.zindex, l.id)

    zIndexBaseLayer: 10, // TODO: modify it automatically on every update/adding of the layer checking the higher

    zIndex: 100, // TODO: modify it automatically on every update/adding of the layer checking the higher

    // used for the GFI
    selectedLayer: '',

    // GUI
    // left controller
    $boxIcons: '',
    $menuBox: '',
    $menuBoxContainer: '',
    $selectedMenuBox: '', // i.e. SelectedLayers, BaseLayers WMS Layers

    getFeautureInfoLayer: [], // TODO: this is the list of the layers selected for the GFI

    initialize: function(suffix, fenixMap, map, guiController) { // (HTMLElement or String, Object)
        this._map = map;
        this._fenixMap = fenixMap;
        this.suffix = suffix;
        this.id = suffix + '-controller';
        this._guiController = $.extend({}, this._guiController, guiController);

        // initialize HashMaps
        this.baseLayersMap = new HashMap();
        this.layersMap = new HashMap();
        this.layersMapZIndexes = new HashMap();
    },

    /**
     *
     * initialize the Layer Controller GUI
     *
     */
    initializeGUI:function() {
        if ( this._guiController ) {
            // adding the box gui
            $('#' + this.id).append(FM.replaceAll(FM.guiController.box, 'REPLACE', this.suffix));

            // adding the box icons container
            $('#' + this.id).append(FM.replaceAll(FM.guiController.boxIcons, 'REPLACE', this.suffix));
            this.$menuBox = $('#' + this.suffix + '-controller-box');
            this.$menuBoxContainer = $('#' + this.suffix + '-controller-box-content');
            this.$boxIcons = $('#' + this.suffix + '-controller-box-icons-container');

            this.$boxIcons

            /** TODO: make it nicer and more dynamic, with a more consistent name **/
            if ( this._guiController.overlay) {
                this.loadIcon('overlay');
                this.initializeOverlayDragging();
            }
            if ( this._guiController.baselayer) {
                this.loadIcon('baselayer');
            }

            if ( this._guiController.wmsLoader) {
                this.loadIcon('wmsLoader');
                var wmsUtils = new FM.WMSUtils();
                var idDD =      this.suffix + '-controller-wmsLoader-dropdown';
                var idContent = this.suffix + '-controller-wmsLoader-content';
                var wmsServers = FM.WMSSERVERS.DEFAULT_EXTERNAL_WMS_SERVERS;
                wmsUtils.WMSCapabilities(idDD, idContent, this._fenixMap, wmsServers);
            }
        }
    },

    /**
     *
     * Inizialize an Icon to load
     *
     * @param toLoad
     */
    loadIcon: function(toLoad) {
        var guiController = FM.guiController;
        var guiBox = toLoad + 'Box';
        var guiIcon = toLoad + 'Icon';

        this.$boxIcons.show();
        this.$boxIcons.append(FM.replaceAll(guiController[guiIcon], 'REPLACE', this.suffix));
        this.$menuBoxContainer.append(FM.replaceAll(guiController[guiBox], 'REPLACE', this.suffix));


        /**$('#' + this.suffix + '-controller-' + toLoad + 'Icon').hover(
            // on mouse hover
            function(event) {
                $(_this._selectedIcon).hide();
                _this._selectedIcon = $('#' + _this.suffix + '-controller-' + toLoad + '-box');
                $('#' + _this.suffix + '-controller-' + toLoad + '-box').show();
                $('#' + _this.suffix + '-controller-box').slideDown("slow");
            },
            function(event) {
            }
        ); **/


         /*this.$menuBoxContainer.attr( "title", $.i18n.prop('_baselayer'));
        try {this.$menuBoxContainer.powerTip({placement: 'n'}); } catch (e) {} */

        var boxIcon = $('#' + this.suffix + '-controller-' + toLoad + 'Icon');
        boxIcon.attr( "title", $.i18n.prop('_' + toLoad));
        try {boxIcon.powerTip({placement: 'ne'}); } catch (e) {}

        var _this = this;
        var $id =  $('#' + _this.suffix + '-controller-' + toLoad + '-box');
        $('#' + this.suffix + '-controller-' + toLoad + 'Icon').click({$id: $id, suffix: this.suffix}, function(event) {
                var $id = event.data.$id;
                var suffix =  event.data.suffix;
                if (_this.$menuBox.is(':visible')) {
                    // check if the select icon is the same that is shown
                    if ( _this.$selectedMenuBox == $id ) {
                        // close the panel
                        _this.$menuBox.slideUp("slow")
                        $id.hide();
                        _this.$selectedMenuBox = '';
                    }
                    else {
                        _this.$selectedMenuBox.hide();
                         $id.slideDown("slow");
                        _this.$selectedMenuBox = $id;
                    }
                }
                else {
                    // if the menu box is invisible
                    _this.$selectedMenuBox = $id;
                    _this.$selectedMenuBox.show();
                    _this.$menuBox.slideDown("slow", function() {
                    });
                }
        });

        // close icon
        $('#' + this.suffix + '-controller-' + toLoad + '-remove').click({$id: $id, suffix: this.suffix}, function(event) {
            var $id = event.data.$id;
            var suffix =  event.data.suffix;
            $('#' + suffix + '-controller-box').slideUp("slow");
            $id.hide();
        });


    },

    /**
     * Initialize the Drag and Drop of the Overlays
     */
    initializeOverlayDragging: function() {
        var _this = this;
        $('#'+ this.suffix + '-controller-overlay-content').sortable({
            cursor: 'move',
            opacity:'0.5',
            start: function (event, ui) {
                //console.log( ui.item.index());
                //$(ui.item).data("startindex", ui.item.index());
            },
            stop: function (event, ui) {
                // getting layers order
                var children = $(ui.item).parent().children();
                var layerIDs = [];
                var zIndexBase = 0;
                for(var i=children.length-1; i >= 0; i-- ) {
                    var id = $(children[i]).data("layer").id;
                    var layertitle = $(children[i]).data( "layer").layer.layertitle;
                    var zIndex =  zIndexBase + 100
                    layerIDs.push($(children[i]).data("layer").id)
                    _this.updateZIndex(id, zIndex);
                    zIndexBase++;
                }
                // setting the z-indexes based on the layers order list
                // N.B. they are set from the bottom to the top
            }
        });
    },

    /**
     *
     * Add a Layer Overlay to the Layer Controller
     *
     * @param l
     */
    layerAdded: function(l) {
        l.layerAdded = true;
        /** TODO: check if works always this solution **/
        if ( !l.layer.zindex ) {
            l.layer.zindex = this.zIndex;
            l.leafletLayer.setZIndex = l.layer.zindex;
        }
        this.zIndex = this.zIndex + 2;

        if ( l.layer.hideLayerInControllerList ) {
            // do nothing
        }
        else {
            // add legend to the mapDIV
            var legendStructure = FM.replaceAll(FM.guiController.legend, 'REPLACE', l.id);
            var idMap =  '#'+ this.suffix + '-container-map';
            $(idMap).append(legendStructure);

            // creating the HTML controller-overlay-item structure
            var idStructure =  '#'+ this.suffix + '-controller-overlay-content';
            var idItem = '#'+ l.id + '-controller-item';
            var idControllerItem = l.id + '-controller-item';
            var overlayStructure = FM.replaceAll(FM.guiController.overlay, 'REPLACE', l.id);

            // TODO: a way to get the layer back by the ID

            // $(idStructure).append(overlayStructure);
            $(idStructure).prepend(overlayStructure);

            // saving the layer information (it's too many information TODO: please set only ID and needed infos
            $( '#'+ l.id  + '-controller-item-box' ).data( "layer", l );

            var index = $('#'+ l.id  + '-controller-item-box').index() + 1;

            // setting up the layer GUI options
            this._layerGUIOptions(l);

            // setting the layer to the HashMap to handle the ID and ZIndex
            this.layersMap.set(l.id, l);
            this.layersMapZIndexes.set(l.layer.zindex, l.id)

            // drag and drop layer
            $(idItem).attr( "title", $.i18n.prop('_dragdroplayer'));
            try { $(idItem).powerTip({placement: 'e'}); } catch (e) {}

            var _this = this;
            // listeners
            $(idItem + '-title').append(l.layer.layertitle);
            $(idItem + '-title').attr( "title", l.layer.layertitle);
            try { $(idItem + '-title').powerTip({placement: 'se'}); } catch (e) {}

            // Remove Layer
            var $removeLayer = $(idItem+ '-remove');
            $removeLayer.click({l:l}, function(event){
                event.stopPropagation();
                if(confirm( $.i18n.prop('_confirmremovelayer'))) {
                    _this.removeLayer(event.data.l);
                }
                event.preventDefault();

            });
            $removeLayer.attr( "title", $.i18n.prop('_removelayer'));
            try { removeLayer.powerTip({placement: 'n'}); } catch (e) {}

            // Enable/Disable layer
            var $enabledisablelayer = $(idItem+ '-enabledisable');
            $enabledisablelayer.click({id:l.id}, function(event) {
                _this.showHide(event.data.id)
            });
            $enabledisablelayer.attr( "title", $.i18n.prop('_enabledisablelayer'));
            try { $enabledisablelayer.powerTip({placement: 'se'}); } catch (e) {}

            // Layer Opacity
            var opacity = 1;
            if ( l.layer.opacity != null )
                opacity = l.layer.opacity;
            try {
                var $layeropacity = $(idItem+ '-opacity');
                $layeropacity.slider({
                    orientation: "horizontal",
                    range: "min",
                    min: 0,
                    max: 1,
                    step: 0.1,
                    value: opacity,
                    slide: function( event, ui ) {
                        FM.LayerUtils.setLayerOpacity(l, ui.value);
                    }
                });
                $layeropacity.attr( "title", $.i18n.prop('_layeropacity'));
                try { $layeropacity.powerTip({placement: 'se'}); } catch (e) {}
            } catch(e) {
                // console.log('jquery-ui is not loaded');
            }

            // Layer GetFeatureInfo
            var $layergfi = $(idItem+ '-getfeatureinfo');
            if ( !l.layer.enablegfi ) $(idItem+ '-getfeatureinfo').css("display","none");
            else {
                $layergfi.click({id:l.id}, function(event) {
                    var l = _this.layersMap.get(event.data.id);
                    if ( _this.selectedLayer.id == event.data.id) {
                        // the layer select is equal to the new one, so deselect it
                        $('#' + _this.selectedLayer.id + '-controller-item-getfeatureinfo').removeClass('fm-icon-getfeatureinfo-selected');
                        _this.selectedLayer = '';
                        l.layer.defaultgfi = false;
                    }
                    else {
                        // unselect old layer icon
                        $('#' + _this.selectedLayer.id + '-controller-item-getfeatureinfo').removeClass('fm-icon-getfeatureinfo-selected');
                        // select new layer icon
                        $('#' + event.data.id + '-controller-item-getfeatureinfo').addClass('fm-icon-getfeatureinfo-selected');
                        _this.selectedLayer = l;
                        l.layer.defaultgfi = true;
                    }
                });
                $layergfi.attr( "title", $.i18n.prop('_getfeatureinfo'));
                try { $layergfi.powerTip({placement: 'se'});} catch (e) {}
                if ( l.layer.defaultgfi ) {
                    // TODO: set default gfi style on the layer
                    this.selectedLayer = l;
                    $('#' + this.selectedLayer.id + '-controller-item-getfeatureinfo').removeClass('fm-icon-getfeatureinfo-selected');
                    // select new layer icon
                    $('#' + l.id + '-controller-item-getfeatureinfo').addClass('fm-icon-getfeatureinfo-selected');
                }
            }



            // Show/Hide Legend
            var $getlegend = $(idItem+ '-getlegend');
            if (l.layer.showlegend == null || l.layer.showlegend != false) {
                $getlegend.click({id:l.id, idToRender: idControllerItem + '-getlegend'}, function(event) {
                    var l = _this.layersMap.get( event.data.id);
                    FM.LayerLegend.getLegend(l, event.data.idToRender)
                });
            }
            $getlegend.attr( "title", $.i18n.prop('_showhidelegend'));
            try { $getlegend.powerTip({placement: 'se'}); } catch (e) {}
            $getlegend.css("display","inline-block");

            // Switch JoinType (From shaded to Point Layer)
            if (l.layer.layertype ) {
                if (l.layer.layertype == 'JOIN' ) {
                    if (l.layer.switchjointype == null || l.layer.switchjointype ) {
                        $(idItem+ '-switchjointype').css("display","inline-block");
                        $(idItem+ '-switchjointype').click({id:l.id}, function(event) {
                            _this.switchJoinType(event.data.id);
                        });

                        if (  l.layer.jointype.toLowerCase() == 'point') {
                            $(idItem+ '-switchjointype').attr( "title", $.i18n.prop('_switchtoshaded'))
                        }
                        else if ( l.layer.jointype.toLowerCase() == 'shaded')  {
                            $(idItem+ '-switchjointype').attr( "title", $.i18n.prop('_switchtopoint'))
                        }
                        try { $(idItem+ "-switchjointype").powerTip({placement: 'se'}); } catch (e) {}
                    }
                }
            }

            // Enable/Disable Swipe
            var $swipelayer = $(idItem+ '-swipe');
            $swipelayer.click({id:l.id}, function(event) {
                var l = _this.layersMap.get( event.data.id);
                if (l.layer.swipeActive == null || !l.layer.swipeActive) {
                    FM.LayerSwipe.swipeActivate(l, _this._fenixMap.suffix + '-handle', _this._fenixMap.suffix + '-map', _this._map);
                    // select icon
                    $swipelayer.addClass('fm-icon-swipe-selected')
                }
                else {
                    FM.LayerSwipe.swipeDeactivate(l, _this._map);
                    // deselect icon
                    $swipelayer.removeClass('fm-icon-swipe-selected')
                }
            });

            // ZoomToLayer or BBOX
            var $zoomtolayer = $(idItem+ '-zoomtolayer');
            if ( l.layer.zoomToBBOX ) {
                $zoomtolayer.css("display","inline-block");
                $zoomtolayer.attr( "title", $.i18n.prop('_zoomtolayer'));
                $zoomtolayer.click({id:l.id}, function(event) {
                    var l = _this.layersMap.get( event.data.id);
                    FM.LayerUtils.zoomToLayer(_this._map, l.layer)
                });
            }
            if (l.layer.zoomTo ) {
                $zoomtolayer.css("display","inline-block");
                $zoomtolayer.attr( "title", $.i18n.prop('_zoomtolayer'));
                $zoomtolayer.click({id:l.id}, function(event) {
                    var l = _this.layersMap.get( event.data.id);
                    FM.LayerUtils.zoomToLayer(_this._map, l.layer)
                });
            }

            // Show/Hide SubIcons
            var $subiconsshowhide  = $(idItem+ '-showhide-subicons');
            var $subiconscontainer = $(idItem+ '-subicons');
            $subiconsshowhide.click(function(event) {
                $subiconscontainer.slideToggle();
                if ( $subiconsshowhide.hasClass("fm-icon-up")) {
                    $subiconsshowhide.removeClass("fm-icon-up")
                    $subiconsshowhide.addClass("fm-icon-down")
                }
                else {
                    $subiconsshowhide.removeClass("fm-icon-down")
                    $subiconsshowhide.addClass("fm-icon-up")
                }
            });
            $subiconsshowhide.attr( "title", $.i18n.prop('_layersubicons'))
            try { $subiconsshowhide.powerTip({placement: 'n'}); } catch (e) { }




        // TODO: it should not be here it should be a check on add layer listener (and check wheater is hidden or not
            /*            console.log(l.layer.enabled);
             // set the layer to disable if enable == false
             if ( !l.layer.enabled ) {
             l.layer.visibility = true;
             this.showHide(l.id);
             }*/



            // enable disable layer
            /*        $(idItem+ '-joinsettings').click({id:l.id}, function(event) {
             var l = _this.layersMap.get( event.data.id);
             l.layer.intervals = 2;
             //_this._fenixMap.createShadeLayerRequest(l, true)
             _this._fenixMap.createPointLayerRequest(l)
             });*/
            /*
             if ( l.layer.jointype ) {
             $(idItem+ '-joinsettings').show();
             $(idItem+ '-joinsettings').attr( "title", $.i18n.prop('_joinsettings'));
             $(idItem+ '-joinsettings').click({id:l.id}, function(event) {
             var l = _this.layersMap.get( event.data.id);
             //FM.LayerUtils.getValuesOuterEqualThan(l, 5, 10000);
             FM.LayerUtils.getValuesInBetweenEqualThan(l, 1500, 100000);

             switch (l.layer.jointype) {
             case 'point' :  _this._fenixMap.createPointLayerRequest(l); break;
             case 'shaded' :  _this._fenixMap.createShadeLayerRequest(l, true); break;
             }
             });
             }*/

        }
    },

    _layerGUIOptions:function(l) {
        var gui = l.gui;
        // at Gaul Level 1 remove the point layer option
        if (l.layer.layertype == 'JOIN') {
            if ( l.layer.gui !=null )
                if (l.layer.gui.nojoinlayerswitch != null && l.layer.gui.nojoinlayerswitch) {
                    // TODO: hide pointlayer option
                    // hiding the legend
                    $('#'+ l.id + '-controller-item-switchjointype').css('display', 'none');
                }
        }
    },

    /**
     *
     * Add a Base Layer to the Layer Controller
     *
     * @param l
     */
    addBaseLayer: function(l) {

        // setting the zIndex and updating it
        //console.log(this.zIndexBaseLayer);
        l.layer.zindex = this.zIndexBaseLayer;
        this.zIndexBaseLayer = this.zIndexBaseLayer + 2;

        // setting the layer to the HashMap to handle the ID and ZIndex
        this.baseLayersMap.set(l.id, l);
        this.layersMapZIndexes.set(l.layer.zindex, l.id);

        // creating the HTML controller-overlay-item structure
        var idStructure =  '#'+ this.suffix + '-controller-baselayer-content';
        var idItem = '#'+ l.id + '-controller-item';
        var overlayStructure = FM.replaceAll(FM.guiController.baselayer, 'REPLACE', l.id);
        overlayStructure = FM.replaceAll(overlayStructure, 'MAPID', this._fenixMap.id);

        $(idStructure).append(overlayStructure);

        var _this = this;
        // listeners
        $(idItem + '-title').append(l.layer.layertitle);

        // add baselayer icon
        $('#' + l.id + '-controller-item-baselayer-image').addClass("fm-icon-baselayer-" + l.layer.layername);

        $(idItem+ '-enabledisable').click({id:l.id}, function(event) {
            _this.showHide(event.data.id)
        });

        var opacity = 1;
        if ( l.layer.opacity != null )
            opacity = l.layer.opacity;
        try {
            $(idItem+ '-opacity').slider({
                orientation: "horizontal",
                range: "min",
                min: 0,
                max: 1,
                step: 0.1,
                value: opacity,
                slide: function( event, ui ) {
                    FM.LayerUtils.setLayerOpacity(l, ui.value);
                }
            });
        }catch(e) {
            //console.log('jquery-ui is not loaded');
        }

        $('#' + l.id + '-controller-box-item').click({id:l.id}, function(event) {
            var id = event.data.id;
            var l = _this.baseLayersMap.get(id);

            // removing the old baselayer
            _this.removeBaseLayerByID(_this.currentBaseLayer.id);
            var oldBaseLayer = _this.baseLayersMap.get(_this.currentBaseLayer.id);
            $('#' + oldBaseLayer.id + "-controller-box-item").removeClass('fm-controller-box-item-baselayer-content-selected')
            $('#' + oldBaseLayer.id + "-controller-item-opacity").hide();

            // add the new baselayer to the map and setting as default one
            $('#' + l.id + "-controller-box-item").addClass('fm-controller-box-item-baselayer-content-selected')
            $('#' + l.id + "-controller-item-opacity").show();
            _this._map.addLayer(l.leafletLayer);
            _this.currentBaseLayer = l;
            _this.setZIndex(l)

        });

        // select baselayer item
        if ( this.baseLayersMap.count() == 1 ){
            $(idItem + '-radio').attr('checked', true);
            // add the layer just if it's the first one
            this._map.addLayer(l.leafletLayer);
            this.currentBaseLayer = l;
            $('#' + l.id + "-controller-box-item").addClass('fm-controller-box-item-baselayer-content-selected')
            $('#' + l.id + "-controller-item-opacity").show();
            _this.setZIndex(l)
        }

    },

    /*
     * Remove a layer from the Map and from the HashMap
     *
     * @param l
     */
    removeLayer:function(l) {
        if ( l.layer.jointype !=null && l.layer.jointype == 'point')
            this.removeLayerPoint(l);
        else
            this.removeLayerDefault(l);
    },


    removeLayerDefault:function(l) {
        // remove layer from the map
        this._map.removeLayer(l.leafletLayer);
        // remove layer from the hashmaps
        this.layersMap.remove(l.id);
        this.layersMapZIndexes.remove(l.layer.zindex);
        $('#' + l.id + '-controller-item-box').remove();
        $('#' + l.id + '-controller-item-getlegend-holder').remove();
    },

    /*
     * Remove the layer Point from the Map and from the HashMap
     *
     * @param id
     */
    removeLayerPoint: function(l) {
        for(var i=0; i < l.layer.pointsLayers.length; i++)
            this._map.removeLayer(l.layer.pointsLayers[i]);

        this.layersMap.remove(l.id);
        this.layersMapZIndexes.remove(l.layer.zindex);
        $('#' + id + '-controller-item-box').remove();
    },

    /*
     * Remove the layer from the Map and from the HashMap
     *
     * @param id
     */
    removeBaseLayerByID: function(id) {
        var l = this.baseLayersMap.get(id);
        // remove layer from the map
        this._map.removeLayer(l.leafletLayer);
    },

    /*
     * Switch a jointype (from Point to Shaded and from Shaded to Point)
     *
     * @param id
     */
    switchJoinType: function(id) {
        var l = this.layersMap.get(id);
        try { $.powerTip.destroy($("#" + l.id +  "-controller-item-switchjointype")); } catch (e) {}
        if (  l.layer.jointype.toLowerCase() == 'point') {
            // alert('point')
            $('#' + l.id + '-controller-item-switchjointype').attr( "title", $.i18n.prop('_switchtopoint'));
            this.switchToShaded(id);
        }
        else if ( l.layer.jointype.toLowerCase() == 'shaded') {
            // alert('shaded')
            $('#' + l.id + '-controller-item-switchjointype').attr( "title", $.i18n.prop('_switchtoshaded'));
            this.switchToPoint(id);
        }
        try { $("#" + l.id +  "-controller-item-switchjointype").powerTip({placement: 'se'}); } catch (e) {}
    },

    /*
     * Switch a Shaded joined layer to a Point one
     *
     * TODO: da vedere
     *
     * @param id
     */
    switchToPointswitchToPoint: function(id) {
        var l = this.layersMap.get(id);
        l.layer.jointype = 'point';

        if ( l.leafletLayer != null )
            this._map.removeLayer(l.leafletLayer);

        this._fenixMap.createPointLayerRequest(l);
    },

    /*
     * Switch a Point joined layer to a Shaded one
     *
     * TODO: da vedere
     *
     * @param id
     */
    switchToShaded: function(id) {
        var l = this.layersMap.get(id);
        l.layer.jointype = 'shaded';

        // cleaning the pointLayers
        if ( l.layer.pointsLayers != null ) {
            for(var i=0; i < l.layer.pointsLayers.length; i++) {
                this._map.removeLayer(l.layer.pointsLayers[i]);
            }
        }
        this._fenixMap.createShadeLayerRequest(l);
    },

    /**
     *  Show/Hide the layer from the map
     *
     * @param id
     */
    showHide: function(id, isReload) {
        try {
            var l = this.layersMap.get(id);
            if (l) {
                if (l.layer.jointype && l.layer.jointype.toLowerCase() == 'point')
                    this.showHidePointLayer(id);
                else
                    this.showHideLayer(id, isReload);
            }
        }catch (e) {
            console.warn("showHide warn:" + e);
        }
    },

    /***
     *
     * Show/Hide a Point Layer
     *
     * @param id
     */
    showHidePointLayer: function(id) {
        var l = this.layersMap.get(id);
        for(var i=0; i < l.layer.pointsLayers.length; i++) {
            if (l.layer.visibility == null || l.layer.visibility) {
                l.layer.visibility = false;
                $('#'+ id+ '-controller-item-enabledisable').removeClass('fm-icon-enable');
                $('#'+ id+ '-controller-item-enabledisable').addClass('fm-icon-disable');
                for(var i=0; i < l.layer.pointsLayers.length; i++)
                    this._map.removeLayer(l.layer.pointsLayers[i]);
            }
            else {
                l.layer.visibility = true;
                $('#'+ id+ '-controller-item-enabledisable').removeClass('fm-icon-disable');
                $('#'+ id+ '-controller-item-enabledisable').addClass('fm-icon-enable');
                for(var i=0; i < l.layer.pointsLayers.length; i++)
                    this._map.addLayer(l.layer.pointsLayers[i]);
            }
        }
    },

    /**
     * Show/Hide the layer  removing it and readding ti to leaflet for performance issues
     *
     * @param id
     */
    showHideLayer:function(id, isReload) {
        try {
            var l = this.layersMap.get(id);
            if (isReload != null && !isReload) {
                if (l.layer.visibility == false) {
                    $('#' + id + '-controller-item-enabledisable').removeClass('fm-icon-enable');
                    $('#' + id + '-controller-item-enabledisable').addClass('fm-icon-disable');
                    this._map.removeLayer(l.leafletLayer)
                }
            }
            else if (isReload != null && isReload) {
                // do nothing (this will maintain the old status
            }
            else {
                if (l.layer.visibility == null || l.layer.visibility) {
                    l.layer.visibility = false;
                    ;
                    $('#' + id + '-controller-item-enabledisable').removeClass('fm-icon-enable');
                    $('#' + id + '-controller-item-enabledisable').addClass('fm-icon-disable');
                    //document.getElementById(id).style.display = 'none';
                    this._map.removeLayer(l.leafletLayer)
                }
                else {
                    l.layer.visibility = true;
                    $('#' + id + '-controller-item-enabledisable').removeClass('fm-icon-disable');
                    $('#' + id + '-controller-item-enabledisable').addClass('fm-icon-enable');
                    //document.getElementById(id).style.display = 'block';
                    this._map.addLayer(l.leafletLayer);
                    this.setZIndex(l) // this method assigns the Z-Index and the ID to the layer
                }
            }
        }catch (e) {
            console.warn("showHideLayer error:"  + e);
        }
    },

    /**
     * Update the Z-Index of a layer retrieving it by ID
     *
     * @param layerID
     * @param updatedZIndex
     */
    updateZIndex: function(layerID, updatedZIndex) {
        var l = this.layersMap.get(layerID);
        l.layer.zindex = updatedZIndex;
        l.leafletLayer.setZindex = updatedZIndex;
        try {
            document.getElementById(l.id).style.zIndex=updatedZIndex;
        }catch (e) {
            console.log('error updateZIndex: ' + l.id + ' doesnt exists');
        }

    },

    /**
     * This method search for the new layer added (a new layer or a layer that was hidden
     * and set the index and the id of the layer that is missing the ID/Z-Index
     *
     * @param l
     */
    setZIndex: function (l) {
        try {
            var layers = document.getElementById(this._fenixMap.tilePaneID).childNodes;
            for (i = 0, len = layers.length; i < len; i++) {
                if (layers[i] !== this._container) {
                    var zIndex = parseInt(layers[i].style.zIndex, 10);
                    if ( isNaN(zIndex))  {
                        layers[i].style.zIndex = l.layer.zindex;
                        layers[i].id = l.id;
                    }
                }
            }
        } catch (e) {
            console.warn("setZIndex error:"  + e);
        }
    },

    selectGetFeatureInfoIcon:function (id) {
        for(var i=0; i < this.layersMap.count(); i++) {
            if ( this.layersMap._data[i] == id )
                $('#' + id + '-controller-item-getfeatureinfo').addClass('fm-icon-getfeatureinfo-selected');
            else
                $('#' + id + '-controller-item-getfeatureinfo').removeClass('fm-icon-getfeatureinfo-selected');
        }

    },

    exportOverlays:function() {
        console.log('exportOverlays');

        /* TODO: make it simpler **/
        var arrayZindex = [];
        this.layersMap.forEach(function(l) {
            arrayZindex.push(l.layer.zindex)
        });
        arrayZindex = arrayZindex.sort()

        console.log(arrayZindex);

        /** get the id based on the zIndex **/
        var arrayLayers = [];
        for (var i = 0; i < arrayZindex.length; i++ ) {
            var found = false;
            if ( !found)
                this.layersMap.forEach(function(l) {
                    //console.log(e);
                    if (l.layer.zindex == arrayZindex[i]) {
                        arrayLayers.push(l.layer);
                        found = true;
                    }
                });
        }
        var clonedArray = $.map(arrayLayers, function (obj) {
            return $.extend(true, {}, obj);
        });
        return clonedArray;
    },

    exportBaselayers:function() {
        /* TODO: make it easier the load of the baselayers
        *  add a value to set the current selected one (also on startup)
        * **/

        return null;
    },

    /**
     *
     * TODO: update the zindex counter to the latest zindex currently used each time is added a layer
     */
    updateZindexCounter: function() {

    }


});

FM.mapController = function (suffix, fenixMap, map, guiController) {
    return new FM.MAPController(suffix, fenixMap, map, guiController);
};