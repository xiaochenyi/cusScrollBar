
// 简写法一
// new ((function(win, doc, $) {
// 	function CusScrollBar(options) {
// 		this._init(options);
// 	}
// 	CusScrollBar.prototype._init = function() {
// 		console.log("test");
// 	}
// 	return CusScrollBar;
// })(window, document, jQuery))();

// 写法二
// var Scroll = {};
// (function(win, doc, $) {
// 	function CusScrollBar(options) {
// 		this._init(options);
// 	}
// 	CusScrollBar.prototype._init = function() {
// 		console.log("test");
// 	}
// 	Scroll.CusScrollBar = CusScrollBar;
// })(window, document, jQuery)

// new Scroll.CusScrollBar();


// 最终写法
(function(win, doc, $) {
	function CusScrollBar(options) {
		this._init(options);
	}
	$.extend(CusScrollBar.prototype, {
		_init: function(options) {
			var self = this;
			self.options = {
				scrollDir      : "y", // 滚动的方向
				contSelector   : "",  // 滚动内容区选择器
				barSelector    : "",  // 滚动条选择器
				sliderSelector : "",  // 滚动滑块儿选择器
                tabItemSelector: ".tab-item", // 标签选择器
                tabActiveClass : "tab-active", // 选中标签类名
                anchorSelector : ".anchor", // 锚点选择器
                wheelStep      : 10,   // 滚轮步长
                correctSelector: ".correct-bot", // 校正元素
                articleSelector: ".scroll-ol" // 文章选择器
 			};
			$.extend(true, self.options, options || {});
			console.log(self.options.contSelector);

            self._initDomEvent();

            return self;
		},
        /**
         * 监听内容的滚动，同步滑块儿的位置
         */
        _bindContScroll : function() {
            var self = this;
            self.$cont.on("scroll", function() {
                var sliderEl = self.$slider && self.$slider[0];
                if(sliderEl) {
                    sliderEl.style.top = self.getSliderPosition() + "px";
                }
            });
            return self;
        },
        _bindMousewheel : function() {
            var self = this;

            self.$cont.on("mousewheel DOMMouseScroll", function(e) {
                e.preventDefault();

                var oEv = e.originalEvent,
                    wheelRange = oEv.wheelDelta ? -oEv.wheelDelta/120 : (oEv.detail || 0)/3;

                self.scrollTo(self.$cont[0].scrollTop + wheelRange * self.options.wheelStep)
            });

            return self;
        },
        /**
         * 计算滑块儿的当前位置
         */
        getSliderPosition : function() {
            var self = this,
                maxSliderPosition = self.getMaxSliderPosition();

            return Math.min(maxSliderPosition, maxSliderPosition * self.$cont[0].scrollTop / self.getMaxScrollPosition())
        },
        /**
         * 初始化DOM
         * 引用
         */
        _initDomEvent : function() {
            var opts = this.options;
            // 滚动内容区对象，必须填
            this.$cont = $(opts.contSelector);
            // 滚动条滑块儿，必须填
            this.$slider = $(opts.sliderSelector);
            // 滚动条对象
            this.$bar = opts.barSelector ? $(opts.barSelector) : self.$slider.parent();
            // 标签项
            this.$tabItem = $(opts.tabItemSelector);
            // 锚点项
            this.$anchor = $(opts.anchorSelector);
            // 正文
            this.$article = $(opts.articleSelector);
            // 校正元素对象
            this.$correct = $(opts.correctSelector);
            // 获取文档对象
            this.$doc = $(doc);

            this._initArticleHeight()._initSliderDragEvent()._bindContScroll()._bindMousewheel()._initTabEvent();
        },
        /**
         * 初始化文档高度
         * @private
         */
        _initArticleHeight : function() {
            var self = this,
                lastArticle = self.$article.last();

            var lastArticleHeight = lastArticle.height(),
                contHeight = self.$cont.height();

            if(lastArticleHeight < contHeight) {
                self.$correct[0].style.height = contHeight - lastArticleHeight - self.$anchor.outerHeight() + "px";
            }
            return self;
        },
        /**
         * 初始化滑块儿的拖动功能
         */
        _initSliderDragEvent : function() {
            var self = this,
                slider = self.$slider,
                sliderEl = slider[0];
            if(sliderEl) {
                var doc = self.$doc,
                    dragStartPagePosition,
                    dragStartScrollPosition,
                    dragContBarRate;
                function mousemoveHandler(e) {
                    e.preventDefault();
                    if(dragStartPagePosition == null) {
                        return;
                    }
                    self.scrollTo(dragStartPagePosition + ((e.pageY - dragStartPagePosition) * dragContBarRate));
                }
                slider.on("mousedown", function(e) {
                    e.preventDefault();
                    console.log("mousedown");
                    dragStartPagePosition = e.pageY;
                    console.log(dragStartPagePosition);
                    dragStartScrollPosition = self.$cont[0].scrollTop;
                    dragContBarRate = self.getMaxScrollPosition() / self.getMaxSliderPosition();
                    doc.on("mousemove.scroll", mousemoveHandler).on("mouseup.scroll", function() {
                        console.log("mouseup");
                        doc.off(".scroll");
                    });
                })
            }
            return self;
        },
        /**
         * 初始化标签切换功能
         */
        _initTabEvent : function() {
            var self = this;
            self.$tabItem.on("click", function(e) {
                e.preventDefault();
                var index = $(this).index();
                self.changeTabSelect(index);
                // 已经滚出可视区的内容高度 + 指定锚点与内容容器的距离
                self.scrollTo(self.$cont[0].scrollTop + self.getAnchorPosiion(index));
            });
            return self;
        },
        /**
         * 切换标签的选中
         * @param index
         * @returns {*}
         */
        changeTabSelect : function(index) {
            var self = this;
                active = self.options.tabActiveClass;
            return self.$tabItem.eq(index).addClass(active).siblings().removeClass(active);
        },
        // 获取指定锚点到上边界的像素数
        getAnchorPosiion : function(index) {
            return this.$anchor.eq(index).position().top;
        },
        // 获取每个锚点位置信息的数组
        getAllAnchorPosiion : function() {
            var self = this,
                allPositionArr = [];
            for(var i = 0; i < self.$anchor.length; i++) {
                allPositionArr.push(self.$cont[0].scrollTop + self.getAnchorPosiion(i));
            }
            return allPositionArr;
        },
        /**
         * 内容可滚动高度
         */
        getMaxScrollPosition : function() {
            var self = this;
            return Math.max(self.$cont.height(), self.$cont[0].scrollHeight) - self.$cont.height();
        },
        /**
         * 滑块儿可移动距离
         */
        getMaxSliderPosition : function() {
            var self = this;
            return self.$bar.height() - self.$slider.height();
        },
        scrollTo : function (positionVal) {
            var self = this;
            var posArr = self.getAllAnchorPosiion();
            // 滚动条的位置与tab标签的对应
            function getIndex(positionVal) {
                for(var i = posArr.length - 1; i >=0 ; i--) {
                    if(positionVal >= posArr[i]) {
                        return i;
                    } else {
                        continue;
                    }
                }
            }
            // 锚点数与标签数相同
            if(posArr.length == self.$tabItem.length) {
                self.changeTabSelect(getIndex(positionVal));
            }
            self.$cont.scrollTop(positionVal);
        }
	});
	win.CusScrollBar = CusScrollBar;
})(window, document, jQuery);

var scroll1 = new CusScrollBar({
    contSelector  : ".scroll-cont",  // 滚动内容区选择器
    barSelector   : ".scroll-bar",  // 滚动条选择器
    sliderSelector: ".scroll-slider"  // 滚动滑块儿选择器
});