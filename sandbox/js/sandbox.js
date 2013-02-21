var Sandbox = function(){
    this.__main = $('#main');
    this.__sidebar = $('#sidebar-nav');

    this.updateMain(this.getActiveItem());
    this.attachEvents();
};

Sandbox.prototype.attachEvents = function(){
    var _self = this;
    this.__sidebar.click(function(ev){
        _self.handleSideNav($(ev.target).closest('li'));
    });
};

Sandbox.prototype.getActiveItem = function(el){
    el = el || this.__sidebar.find('.active');
    return el.attr('data-type');
};

Sandbox.prototype.handleSideNav = function(el){
    var _self = this;
    if(el.hasClass('active')) return;

    var content = _self.getActiveItem(el);
    if(!content) return;

    el.parent().find('.active').removeClass('active');
    el.addClass('active');

    _self.updateMain(content);
};

Sandbox.prototype.updateMain = function(type){
    var _self = this;
    var markup = [];
    var dataset = Data[type.toLowerCase()];
    var header = dataset && dataset.header ? dataset.header : type;
    markup.push(_self.getSectionHeader(header, 'h3'));
    markup.push(_self['render'+type] ? _self['render'+type](dataset.content) : _self.renderGeneric(type));
    this.__main.html(markup.join(''));
};

Sandbox.prototype.getSectionHeader = function(label, tag){
    return [
        '<',tag,' class="header">',
            label,
        '</',tag,'>'
    ].join('');
};

Sandbox.prototype.renderGeneric = function(type){
    var markup = [];
    markup.push(type, ' go here');
    return markup;
};

Sandbox.prototype.renderTableHeader = function(headers){
    var markup = ['<table class="table table-hover">'];
    markup.push('<thead><tr>');
    for(var i=0; i<headers.length; i++){
        markup.push('<th>',headers[i],'</th>');
    }
    markup.push('</tr></thead>');
    return markup.join('');
};

Sandbox.prototype.formatItem = function(item, type){
    switch(type){
        case 'hexVal':
            return item.toUpperCase();
        case 'swatch':
            return ['<span class="swatch" style="background-color:',item,';">&nbsp;</span>'].join('');
        case 'button':
            var isDropdown = item.indexOf('Dropdown') != -1;
            return ['<button class="',item,'">Sample', (isDropdown ? '<span class="spriteBg"></span>' : ''),'</button>'].join('');
        default:
            return item;
    }
};

Sandbox.prototype.renderItemCell = function(item, type, className){
    var markup = [];
    markup.push('<td class="',className,'">');
    markup.push(this.formatItem(item, type));
    markup.push('</td>');
    return markup.join('');

};

Sandbox.prototype.renderItemTable = function(type, data, titles){
    var markup = [];
    var currCellItem, renderProp;
    markup.push(this.renderTableHeader(titles));
    markup.push('<tbody>');
    for(var i=0; i<data.length; i++){
        markup.push('<tr>');
        for(var j=0; j<dataRendering[type].length; j++){
            renderProp = dataRendering[type][j];
            currCellItem = data[i];
            markup.push(this.renderItemCell(currCellItem[renderProp.data], renderProp.type, renderProp.className));
        }
    }
    markup.push('</tbody></table>');
    return markup.join('');
};

Sandbox.prototype.renderColors = function(data){
    var curr;
    var markup = [];
    var titles = ['&nbsp;','Classname', 'Value', 'Swatch', 'Usage'];
    for(var i in data.sections){
        curr = data.sections[i];
        markup.push(this.getSectionHeader(curr.label, 'h4'));
        markup.push(this.renderItemTable('colors', curr.defs, titles));
    }
    return markup.join('');
};

Sandbox.prototype.renderButtons = function(data){
    var curr;
        var markup = [];
        var titles = ['&nbsp;','Classname', 'Example', 'Usage'];
        for(var i in data.sections){
            curr = data.sections[i];
            markup.push(this.getSectionHeader(curr.label, 'h4'));
            markup.push(this.renderItemTable('buttons', curr.defs, titles));
        }
        return markup.join('');
};




window.sandbox = new Sandbox();

