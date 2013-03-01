function Proto2App() {
    var evtId = '4118535';  // default event id for testing purposes
    var $seatmap = $("#seatmap");
    var $sectionsContainer = $("#filterContainer .sectionsContainer");

    var sectionItemHtml = '<section id="cat1" class="mediumBg seatSection {{style}}" data-section="{{sectionId}}"><h2><span class="title spriteBg">{{sectionName}}<button class="btn ctaBtn btnSm">From ${{sectionMinPrice}}</button><button class="mediumBg iconBtn spriteBg closeSection mediumBorder">Remove section</button></span><em class="seatView" style="background-image:url(\'{{sectionViewUrl}}\');"></em></h2><ul class="filters"><li class="mediumBorder">Row AA | 1-3 tickets<span>FedEx Delivery</span><em class="contrastBg lightestText">$110</em></li><li class="mediumBorder">Row AA | 1-3 tickets<span>FedEx Delivery</span><em class="contrastBg lightestText">$110</em></li><li class="mediumBorder">Row AA | 1-3 tickets<span>FedEx Delivery</span><em class="contrastBg lightestText">$110</em></li></ul></section>';
    if (window.location.hash !== '') { 
        evtId = window.location.hash.replace('#', '');
    }

    // add dom events and interaction with map
    $sectionsContainer.delegate("section", "click", function (e) {
        var $target = $(e.target);
        var $this = $(this);

        if ($target.hasClass('closeSection')) {
            $seatmap.blueprint.blurSection($this.data('section'));                
        }
        else if ($target.hasClass('title')) {
            if ($this.hasClass('expanded')) {
                $this.removeClass('expanded').addClass('collapsed');
            }
            else {
                $this.removeClass('collapsed').addClass('expanded');
            }
        }
    });

    // launch blueprint
    $seatmap.blueprint({
        eventId: evtId,
        useInventoryApi: true,
        token: 'qj9FVW4Gi5lUiN7zujxQoW4AdxQa',
        useStubHubStyle: true,
        onMapReady: function(status) {
            console.log("*onMapReady* status=", status);
        },
        onSectionFocus: function(s) {
            var sectionItem = $seatmap.blueprint.getSectionData(s);
            $sectionsContainer.find('section').removeClass('expanded').addClass('collapsed');
            $sectionsContainer.append(
                sectionItemHtml
                    .replace(/{{sectionName}}/, sectionItem.na)
                    .replace(/{{sectionMinPrice}}/, sectionItem.mnp)
                    .replace(/{{sectionViewUrl}}/, $seatmap.blueprint.getViewFromSectionUrl(s, '500x271'))
                    .replace(/{{style}}/,"expanded")
                    .replace(/{{sectionId}}/, s)
            );            
        },
        onSectionBlur: function(s) {
            $sectionsContainer.find("section[data-section='" + s + "']").remove();
        }
    });
}


