persistState Version 1.0.0 is releaed under [MIT License](http://opensource.org/licenses/MIT)

The persistState widget is a jQuery Ui widget that will transparently save the state of checkboxes, inputs, selects, etc in localStorage, restoring these on the user's next visit to the page.

This means that users can configure the controls in their local workspace however they want and it will be restored for them next time they visit the page with no work on your part!

[Demo available here](http://togakangaroo.github.io/persistState/)

The supported control types are easily extensible. 

Simply activate the persistState widget on any elements for which you want to track state.

    $('.persist-state').persistState();

By default supports inputs, textareas, select, checkbox, jquery ui resizable, and jquery ui draggable controls

Dependencies
============

* jQuery (version 1.8+ tested should work with jQuery > 1.6)
* jQuery Ui Widget Factory (should work with all recent versions)

Timing
======
By default, all controls with the persistState widget will store all supported states when the control raises it's 'change' event or when the window unloads.

All controls tagged with persistState will restore their state on the event loop following when the widget is initialized. This behavior is optional and can be modified by
passing in an `autoRestore` option when initializing the widget. Valid values are

* true - restore now (do not wait, just do it now)
* false - do not restore (useful if you want to do it manually)
* 'defer' - restore in a bit (default) 

Methods
=======
All persistState widgets also supply the following methods

* **key** - Get the key under which this element would be stored. By default calls the internal getPath function, override this function to provide your own getPath implementation (see Persistence Stores area below for more)
* **persist** - Persist state for this control now
* **restore** - Restore state of this control now
* **clear** - Clear all stored state by removing window unload events


Extending Supported Controls
============================

To enable support for a new control-type simply extend the `$.ow.persistState.elementPersistence` object. The key should be a string selector which jquery will match to your desired control type and the value must be an object with `saveState` and `restoreState` functions.

***Note:*** Any widget created through the jQuery Ui widget factory will have a `:namespace-widgetName` selector. You can also [create custom selectors by extending jquery expr](http://james.padolsey.com/javascript/extending-jquerys-selector-capabilities/).

For example, support for most input controls (except for checkboxes which work differently) is implemented like this:

```javascript
$.ow.persistState.elementPersistence['textarea,input:not(:checkbox),select'] = {
    saveState: function($el) {
        return {val: $el.val() }
    },
    restoreState: function($el, state) {
        if(!state) return;
        if($el.val() !== state.val)
            $el.val( state.val ).trigger('change');
    }
};
```
Suppose you created your own jQuery Ui Widget called collapsible which simply shows/hides areas depending on a clickable button. You can provide persistence support like so:

```javascript
$.ow.persistState.elementPersistence[':myNamespace-collapsible'] = { //All jQuery Ui widgets havfe a custom selector
    saveState: function($el) {
        var widget = $el.data('myNamespace-collapsible'); //All jQuery Ui widgets get stored in the element's data collection
        return { collapsed: widget.isCollapsed };
    },
    restoreState: function($el, state) {
        if(!state) return;
        var widget = $el.data('myNamespace-collapsible')
        widget.toggleCollapsed(!state.collapsed);
    }
};
```
And that's it!

Persistence Stores
============================

By default, the states of controls are stored in localStorage keyed by url+path-to-element. Therefore you might have something like this:

```javascript
localStorage['//persistState'] == JSON.stringify({
	'MyPage/MySubPage?name=blah': {
		'#editor-options>div:eq(0)>label:eq(1)>input:eq(0)': {
			':checkbox': { checked: true }
    	}
    }
})
```

This has a few limitations

* On highly dynamic page where order and location of elements changes frequently the child paths will not be a reliable selector
* Control state is only saved/restored in this particular browser on this particular PC

The first issue could be solved by giving all locally persisted elements unique id attributes. You can also address these by implementing your own storage
mechanism. To do so overwrite the `$.ow.persistState.getStates` function to return an object. For example, here is the default implementation:

```javascript
//Return an object that lets you operate on persisted state
$.ow.persistState.getStates = function(localStoreKey) {
    var  stateRoot  = JSON.parse(localStorage[localStoreKey]||'{}')||{}
        ,ctxStates  = tryGet(stateRoot, window.location.pathname + window.location.search)    //keyed to url
        ;
    return { 
    	//get the state for a particular storage key (from elementPersistence)
         getState: function(key) { return tryGet(ctxStates, key) }  
         //save all the current states
        ,save: function(){ 
            localStorage[localStoreKey] = JSON.stringify(stateRoot)
        }
    };

    function tryGet(obj, key) { return obj.hasOwnProperty(key) ? obj[key] : (obj[key] = {}) }
}
```