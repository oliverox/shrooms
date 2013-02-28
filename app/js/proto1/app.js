function EventApp() {
    this.__slideOutOpen = false;
    this.__selectedTabIndex = 0;
    this.attachEvents();
}

EventApp.prototype.toggleNav = function(){
    var navVisible = this.__slideOutOpen;
    if(navVisible){
        $('.mainNav').css('left','-100%');
        $('header, .body').css('marginLeft',0);
    } else {
        $('.mainNav').css('left',0);
        $('header, .body').css('marginLeft','90%');
    }
    this.__slideOutOpen = !this.__slideOutOpen;
};

EventApp.prototype.toggleItem = function(item){
    item = typeof item == 'string' ? $('#'+item) : item;
    $(item).toggle('fast', 'linear');
};

EventApp.prototype.scrollTab = function(direction){
    var left = 100; //Tab width in percentage
    var gutter = $('.arrowRight').width(); //Arrow width in percentage
    var tabs = $('.tabs');
    var currOffset = tabs.offset().left;
    var tabNum = tabs.find('li').length;
    var tabW = tabs.width();

    if(direction == 'left') {
        if(this.__selectedTabIndex <= 0)
            return;
        left = --this.__selectedTabIndex * (2 * left) * -1;


    } else {
        if(this.__selectedTabIndex >= tabNum-1)
            return;
        left = ++this.__selectedTabIndex * (2 * left) * -1;
    }

    $('.tabs').css('left', left+'%');
};

EventApp.prototype.handleClick = function(action, target){
    var dataTarget = target.attr('data-target');
    switch(action){
        case 'scrollTab':
            this.scrollTab(dataTarget);
            break;
        case 'toggleNav':
            this.toggleNav();
            break;
        case 'toggle':
            this.toggleItem(dataTarget);
        default:
            break;
    }
};

EventApp.prototype.attachEvents = function() {
    var _self = this;
    $('body').click(function(ev){
        var target = $(arguments[0].target);
        var action = target.attr('data-type');
        if(!action){
            return;
        }
        _self.handleClick(action, target);
    })
};