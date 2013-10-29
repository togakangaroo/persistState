// UMD from https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'jqueryUI'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(require('jquery'), require('jqueryUI'));
    } else {
        // Browser globals (root is window)
        factory(root['jQuery'], root['jQuery.ui']);
    }
}(this, function ($) {
'use strict'

/*
Transparently store the element/control's state and restore it on page refresh.
By default depends on the existence localStorage and JSON.parse().

This widget works by storing a serialization of a control's state in localStorage (by default) hashed 
by the page url and a unique selector for the element.

Saving control state happens in response to the control's change event and the window's 
unload event. By default, state is restored automatically soon after the widget is initialized.

NOTE: The widget itself does not know how to serialize the state of any given element, 
instead it must be provided elementPersistence extensions (see below).
Default implementations are provided for saving state of ':checkbox',':ui-resizable',':ui-draggable','textarea,input:not(:checkbox),select'
*/

var  nativeBind         = Function.prototype.bind
    ,slice              = Array.prototype.slice
    ;
$.widget('ow.persistState', {
    options: {
        //Should all controls be restored by default when this control is generated.
        //true - restore now, false - do not restore, 'defer' - restore in a bit (default)
         autoRestore:   'defer',
         persistenceKey: window.location.pathname + window.location.search //keyed to url by default
    }

    ,_create: function() {
        this.persistenceKey = '//persistenceState';

        var  restore = bind(this.restore, this);
        this.options.autoRestore === true && restore();
        this.options.autoRestore === 'defer' && setTimeout(restore, 1);
        
        this._boundPersist = bind(this.persist, this);               //this needs to be the same reference througout or we can't turn it off
        this._setupAutoPersistence('on');
    }

    ,_setupAutoPersistence: function(onOff) {
        $(window)[onOff]('unload', this._boundPersist);                //when trying to unload the page
        this.element[onOff]('change', this._boundPersist);
    }
    // Get the key under which this element would be stored. By default calls the internal getPath function
    // override this function to provide your own getPath implementation
    ,key: function() {
        return getPath(this.element);
    }
    //Persist state for this control now
    ,persist: function() {
        for(var serializers = this._elementSerializers(), i=serializers.length-1; i>=0; i-=1)
            this._save( serializers[i] );
    }
    //Restore state of this control now
    ,restore: function() {
        for(var serializers = this._elementSerializers(), i=serializers.length-1; i>=0; i-=1)
            this._restore( serializers[i] );
    }
    //Clear all stored state by removing window unlowad events
    ,clear: function() {
        for(var serializers = this._elementSerializers(), i=serializers.length-1; i>=0; i-=1)
            this._clear( serializers[i] );
    }

    ,_restore: function(serializer) {
        var  element     = $.ow.persistState.getStates( this.persistenceKey, this.options.persistenceKey ).getState( this.key() )
            ;
        if(element.hasOwnProperty(serializer.selector))
            serializer.restoreState(this.element, element[serializer.selector]);
    }

    ,_save: function(serializer) {
        var  states     = $.ow.persistState.getStates( this.persistenceKey, this.options.persistenceKey )
            ,element    = states.getState( this.key() )
            ;
            element[serializer.selector] = serializer.saveState(this.element);
            states.save();
    }

    ,_clear: function(serializer) {
        var  states     = $.ow.persistState.getStates( this.persistenceKey, this.options.persistenceKey )
            ,element    = states.getState( this.key() )
            ;
            this._setupAutoPersistence('off');
            if(!element.hasOwnProperty(serializer.selector))
                return;
            delete element[serializer.selector];
            states.save();
    }

    ,_elementSerializers: function() {
        var serializers = [];
        for(var selector in elementPersistence)
            if(this.element.is(selector))
                serializers.push( $.extend({}, elementPersistence[selector], {selector: selector}) );
        return serializers;
    }
});

//How the state object for each control is stored. 
//Default implementation is localStorage keyed by url. Overwrite this object to use a different state persistence mechanism.
$.ow.persistState.getStates = function(persistenceKey, path) {
    var  stateRoot  = JSON.parse(localStorage[persistenceKey]||'{}')||{}
        ,ctxStates  = tryGet(stateRoot, path)      
        ;
    return { 
         getState: function(key) { return tryGet(ctxStates, key) }
        ,save: function(){ 
            localStorage[persistenceKey] = JSON.stringify(stateRoot)
        }
    };

    function tryGet(obj, key) { return obj.hasOwnProperty(key) ? obj[key] : (obj[key] = {}) }
}

var isjQueryOld = /^(0|1)\.[0-8]\./.test($.fn.jquery); // <=1.8.*
var toggleCheckbox = isjQueryOld ? jQueryOldToggleCheckbox : function($el) { $el.trigger('click') } //https://github.com/knockout/knockout/issues/987

/*
The persistState widget itself does not know how to serialize the state of any given element, 
instead it must be provided elementPersistence extensions (see below).
These are tuples of a jQuery selector, a function to serialize state to an object, and a function to restore state
from an serialized state object. A persisted element will have the save and restore functions of all
matching selectors applied to it.

To serialize additonal states simply extend this object
*/
var elementPersistence = $.ow.persistState.elementPersistence = {
    ':checkbox': {
        saveState: function($el) {
            return { checked: $el.prop('checked') }
        },
        restoreState: function($el, state) {
            if(!state || state.checked === $el.prop('checked')) return;
            toggleCheckbox($el);
        }
    }

    ,':ui-resizable': {
        saveState: function($el) {
            return {width: $el.width(), height: $el.height() }
        },
        restoreState: function($el, state) {
            if(!state) return;
            $el.css( $.extend({top: 0, left: 0}, state) );
        }
    }

    ,':ui-draggable': {
        saveState: function($el) {
            return {left: $el.css('left'), top: $el.css('top') }
        },
        restoreState: function($el, state) {
            if(!state) return;
            $el.css( state );
        }
    }

    ,'textarea,input:not(:checkbox),select': {
        saveState: function($el) {
            return {val: $el.val() }
        },
        restoreState: function($el, state) {
            if(!state) return;
            if($el.val() !== state.val)
                $el.val( state.val ).trigger('change');
        }
    }
};

return elementPersistence;

////////////////////////////////////////////////////////////////////////////

function getPath($node) {
    return getPathParts($node).join('>');
};
function getPathParts($node) {
    for(var pathParts=[],name; $node.length; $node=$node.parent()) {
        if($node.prop('id')) {
            pathParts.unshift('#'+$node.prop('id'));
            return pathParts;
        }
        name = getPathElementNamePart($node);
        if(!name) return pathParts;                 //Is this really needed?
        pathParts.unshift(name);
    }
    return pathParts;
}
function getPathElementNamePart($node) {
    var name = $node.prop('localName');
    if (!name) return null;
        name = name.toLowerCase();

    var siblings = $node.parent().children(name); //A call to siblings here would need this element added back and I'm not sure what guarantees there are for ordering
    if (!siblings.length) 
        return name;
    return name +':eq(' + siblings.index($node) + ')';
}


function jQueryOldToggleCheckbox($el) {
    //This should be simple right? See http://stackoverflow.com/a/8595601/5056
    //and "simulating events to adjust knockout models" jasmine spec
    //all this is nessessary to get everything working with knockout
    var changeTo = !$el.prop('checked');
    if(changeTo)
        $el.attr('checked', true);
    else
        $el.removeAttr('checked');
    $el.trigger('click');
    $el.prop('checked', changeTo);
}

////////////////////////////////////////////////////////////
//Helper functions stolen brazenly from underscore.js

function bind(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
}

}));
