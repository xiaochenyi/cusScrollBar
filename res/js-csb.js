/**
 * Created by Administrator on 17-7-7.
 */
(function(window,document){
    var getXY = QW.NodeH.getXY,
        mix = QW.ObjectH.mix,
        EventTargetH = QW.EventTargetH,
        on = EventTargetH.on,
        un = EventTargetH.un,
        EventH = QW.EventH,
        getDetail = EventH.getDetail,
        preventDefault = EventH.preventDefault,
        stopPropagation = EventH.stopPropagation,
        getPageXY = function(dir,e) { //根据dir ["x"||"y"]及event对象得到鼠标坐标
            return EventH["getPage"+(dir=="x"?"X":"Y")](e);
        },
        Dom = QW.Dom,
        addClass = Dom.addClass,
        removeClass = Dom.removeClass,
        hasClass = Dom.hasClass,
        CustEvent = QW.CustEvent,
        Selector = QW.Selector,
        queryEl = function(selector){ //选择器
            if(selector && typeof(selector)!="string"){
                if("nodeType" in selector){
                    return selector;
                }
                if("core" in selector && "length" in selector){
                    return selector[0];
                }
            }
            return Selector.query(null,selector)[0];
        },
        selectEventType = "onselectstart" in document.createElement("div")? "selectstart" : "mousedown",
        disableSelection = function(el){ //禁用选择功能
            on(el,selectEventType,preventDefault);
        },
        enableSelection = function(el){ //开放选择功能
            un(el,selectEventType,preventDefault);
        };


    function CusScrollBar(opts) {
        this.options = mix({
            scrollDir:"y",           //滚动条方向          [必填项,x||y,默认y]
            contSelector:"",         //内容容器元素选择器  [必填项]
            scrollBarSelector:"",    //滚动条模拟元素选择器[非必填项,如果为空则自动取sliderSelector的父容器]
            sliderSelector:"",       //滚动条滑块          [必填项]
            addBtnSelector:"",       //滚动条坐标增加按钮(横向的向右,纵向的向下按钮)
            subBtnSelector:"",       //滚动条坐标减少按钮(横向的向左,纵向的向上按钮)
            btnClkStepSize:60,       //增加减少按钮按下时自动滚动的幅度
            addStepSize:30,          //滚动条坐标增加按钮每点击一次增加的幅度
            subtractStepSize:30,     //滚动条坐标减少按钮每点击一次减少的幅度
            sliderMinHeight:10,      //滑块最小高度
            sliderAlwaysShow:false,  //滑块是否保持显示(false则按照内容是否超出容器高度自动控制)
            scrollAnimTime:80,       //单次scrollToX 或 scrollToY所使用的动画时长
            scrollStepTime:10,       //scrollToX 或 scrollToY动画每帧时长
            scrollAnimAwait:false,   //滚动条动画是否等待上一帧完毕才执行交互响应
            wheelStepSize:80,        //滚轮控制滚动时,每次滚动触发的位移距离
            autoInitUiEvent:true     //是否自动初始化UI事件绑定
        }, opts||{},true);
        CustEvent.createEvents(this,CusScrollBar.EVENTS);
        this._init();
    };
    //自定义事件,依次对应: 滚动动画每一帧触发、滚动动画结束、滚动条变化、滑块尺寸变更、滑块坐标变更、内容容器改变
    CusScrollBar.EVENTS = 'scrollToAnim scrollToAnimEnd scroll resizeSlider sliderHide removeSlider contChange'.split(' ');

    var _tl = {y:"Top",x:"Left"},_wh = {y:"Height",x:"Width"},_mum={x:0,y:1};

    mix(CusScrollBar.prototype,{

        //得到基本元素及方向参数
        _init:function() {

            var _t = this, opts = _t.options,

            //滚动条滑块
                _sliderEl = _t._sliderEl = opts.sliderSelector && queryEl(opts.sliderSelector),

            //滚动条方向 x || y
                _dir = _t._dir = opts.scrollDir.toLowerCase();

            //内容容器
            _t._contEl = queryEl(opts.contSelector);

            //滚动条
            _t._scrollBarEl = opts.scrollBarSelector?queryEl(opts.scrollBarSelector):_sliderEl && _sliderEl.parentNode;

            _t.addBtnEl = opts.addBtnSelector && queryEl(opts.addBtnSelector);
            _t.subBtnEl = opts.subBtnSelector && queryEl(opts.subBtnSelector);

            //根据设定坐标方向得到基本计算属性
            _t._tl = _tl[_dir];
            _t._tlLCase = _t._tl.toLowerCase();
            _t._stl = "scroll"+_t._tl;
            _t._wh = _wh[_dir];
            _t._whLCase = _t._wh.toLowerCase();
            _t._swh = "scroll"+_t._wh;
            _t._owh = "offset"+_t._wh;


            opts.autoInitUiEvent && _t.initUIEvent();
        },

        //改变滚动条插件绑定到的容器为另一个contEl
        changeContEl:function(contSelector){
            var _t = this,autoInitEvt = _t.options.autoInitUiEvent;
            autoInitEvt && _t.unbindMousewheel().unbindScrollEvent().unbindSliderHover4Cont();
            _t._contEl = queryEl(contSelector);
            autoInitEvt && _t.resizeSlider().removeSlider().bindMousewheel().bindScrollEvent().bindSliderHover4Cont();
            _t.fire("contChange");
            return _t;
        },

        //初始化UI交互
        initUIEvent:function() {
            return this.resizeSlider().removeSlider().bindMousewheel().bindSliderDragEvent().bindScrollBarEvent().bindScrollEvent().bindBtnEvent().bindSliderHover().bindSliderHover4Cont();
        },

        //为滚动条两端按钮绑定交互功能
        bindBtnEvent:function() {
            var _t = this;
            if(_t.addBtnEl){
                _t._addBtnEvtAnim = _t._addBtnEvtAnim||function(){
                    _t.scrollToAnim(_t.getScrollPosition()+_t.options.btnClkStepSize);
                };
                _t._addBtnMouseUpHandler = _t._addBtnMouseUpHandler ||function(e){
                    _t.un("scrollToAnimEnd",_t._addBtnEvtAnim);
                    un(document,"mouseup",_t._addBtnMouseUpHandler);
                };
                _t._addBtnMouseDownHandler = _t._addBtnMouseDownHandler || function(e){
                    on(document,"mouseup",_t._addBtnMouseUpHandler);
                    _t.on("scrollToAnimEnd",_t._addBtnEvtAnim);
                    _t._addBtnEvtAnim();
                };
                on(_t.addBtnEl,"mousedown",_t._addBtnMouseDownHandler);
            }

            if(_t.subBtnEl){
                _t._subBtnEvtAnim = _t._subBtnEvtAnim || function(){
                    _t.scrollToAnim(_t.getScrollPosition()-_t.options.btnClkStepSize);
                };
                _t._subBtnMouseUpHandler = _t._subBtnMouseUpHandler || function(e){
                    _t.un("scrollToAnimEnd",_t._subBtnEvtAnim);
                    un(document,"mouseup",_t._subBtnMouseUpHandler);
                };
                _t._subBtnMouseDownHandler = _t._subBtnMouseDownHandler || function(e){
                    on(document,"mouseup",_t._subBtnMouseUpHandler);
                    _t.on("scrollToAnimEnd",_t._subBtnEvtAnim);
                    _t._subBtnEvtAnim();
                };
                on(_t.subBtnEl,"mousedown",_t._subBtnMouseDownHandler);
            }
            return _t;
        },
        //解除滚动条两端按钮交互功能
        unbindBtnEvent:function() {
            var _t = this;
            if(_t.addBtnEl){
                _t._addBtnMouseDownHandler && un(_t.addBtnEl,"mousedown",_t._addBtnMouseDownHandler);
                _t._addBtnMouseUpHandler && _t._addBtnMouseUpHandler();
            }
            if(_t.subBtnEl){
                _t._subBtnMouseDownHandler && un(_t.subBtnEl,"mousedown",_t._subBtnMouseDownHandler);
                _t._subBtnMouseUpHandler && _t._subBtnMouseUpHandler();
            }
            return _t;
        },

        /** 在内容容器上绑定滚轮控制滚动条
         * @ bindEl 默认为this._contEl 可自由绑定到任意元素上 (比如document)
         **/
        bindMousewheel:function(bindEl){
            var _t = this,contEl = bindEl || _t._contEl;
            if(contEl){
                _t._mousewheelHandler = _t._mousewheelHandler || function(e){
                    preventDefault(e);
                    var wheelDelta =  getDetail(e)
                    _t.scrollToAnim(_t.getScrollPosition()+wheelDelta/Math.abs(wheelDelta)*_t.options.wheelStepSize);
                };
                on(contEl,"mousewheel",_t._mousewheelHandler);
            }
            return _t;
        },
        //解除内容容器滚轮跟随
        unbindMousewheel:function(bindEl){
            var _t = this,contEl = bindEl || _t._contEl;
            contEl && _t._mousewheelHandler && un(contEl,"mousewheel",_t._mousewheelHandler);
            return _t;
        },

        //初始化内容容器的滚动事件
        bindScrollEvent:function(bindEl) {
            var _t = this,contEl = bindEl || _t._contEl;
            if(contEl){
                _t._contScrollHandler = _t._contScrollHandler || function() {
                    _t.removeSlider();
                };
                on(bindEl || _t._contEl,"scroll",_t._contScrollHandler);
            }
            return _t;
        },
        //解除内容容器的滚动事件
        unbindScrollEvent:function(bindEl) {
            var _t = this,contEl = bindEl || _t._contEl;
            contEl && _t._contScrollHandler && un(bindEl || _t._contEl,"scroll",_t._contScrollHandler);
            return _t;
        },

        //初始化滑块拖动元素DOM事件
        bindSliderDragEvent:function(){
            var _t = this,sliderEl = _t._sliderEl;
            if(sliderEl){
                _t._docMuseupHandler = _t._docMuseUpHandler || function(e){ //除了鼠标释放，拉取下一屏之后也会触发该方法
                    _t._dragStaPagePos = null;
                    e && preventDefault(e);
                    sliderEl.releaseCapture && sliderEl.releaseCapture(); //for ie6 解除绑定滑块事件监听
                    removeClass(sliderEl,"slider-active");
                    enableSelection(document); //重启拖选
                    un(document,"mouseup,contextmenu",_t._docMuseupHandler);
                    un(document,"mousemove",_t._docMusemoveHandler);
                };
                _t._docMusemoveHandler = _t._docMuseMoveHandler ||  function(e){
                    if(_t._dragStaPagePos==null)return;
                    //起始坐标点 + (鼠标位移距离*滚动条最大坐标值/滚动条容器尺寸)
                    _t.scrollTo(_t._dragStaScrollPos+(getPageXY(_t._dir,e) - _t._dragStaPagePos)*_t._dragStaScrollBarRate);
                };
                _t._sliderMousedownHandler = _t._sliderMousedownHandler || function(e){
                    stopPropagation(e);
                    preventDefault(e);
                    _t._dragStaPagePos = getPageXY(_t._dir,e); //鼠标按下时页面中的所在坐标
                    _t._dragStaScrollBarRate = _t.getScrollSize()/_t.getScrollBarSize(); //鼠标按下时计算滚动条最大值与滚动条容器的比率(用于将鼠标位移距离转换为滚动条位移距离)
                    _t._dragStaScrollPos = _t.getScrollPosition(); //鼠标按下时滚动条所在的坐标点
                    sliderEl.setCapture && sliderEl.setCapture(); //for ie6 绑定事件监听到滑块
                    addClass(sliderEl,"slider-active");
                    disableSelection(document); //关闭拖选
                    on(document,"mouseup,contextmenu",_t._docMuseupHandler);
                    on(document,"mousemove",_t._docMusemoveHandler);
                };
                on(sliderEl,"mousedown",_t._sliderMousedownHandler);
            }
            return _t;
        },
        //解除滑块拖动元素DOM事件
        unbindSliderDragEvent:function(){
            var _t = this,sliderEl = _t._sliderEl;
            if(sliderEl){
                _t._sliderMousedownHandler && un(sliderEl,"mousedown",_t._sliderMousedownHandler);
                _t._docMuseupHandler && _t._docMuseupHandler();
            }
            return _t;
        },

        //创建滑块hover处理事件
        createSliderHoverHandler:function(){
            var _t = this;
            _t._sliderOnHoverHandler = _t._sliderOnHoverHandler||function(){
                addClass(_t._sliderEl,"slider-hover");
            };
            _t._sliderUnHoverHandler = _t._sliderUnHoverHandler||function(){
                removeClass(_t._sliderEl,"slider-hover");
            };
            return _t;
        },
        //初始化滑块hover事件
        bindSliderHover:function(){
            var _t = this,sliderEl = _t._sliderEl,scrollBarEl = _t._scrollBarEl;
            if(sliderEl){
                _t.createSliderHoverHandler();
                on(sliderEl,"mouseenter",_t._sliderOnHoverHandler);
                on(sliderEl,"mouseleave",_t._sliderOnHoverHandler);
                on(scrollBarEl,"mouseenter",_t._sliderOnHoverHandler);
                on(scrollBarEl,"mouseleave",_t._sliderUnHoverHandler);
            }
            return _t;
        },
        //解除滑块hover事件
        unbindSliderHover:function(){
            var _t = this,sliderEl = _t._sliderEl,scrollBarEl=_t.scrollBarEl;
            if(contEl && sliderEl){
                if(_t._sliderOnHoverHandler){
                    un(sliderEl,"mouseenter",_t._sliderOnHoverHandler);
                    un(scrollBarEl,"mouseenter",_t._sliderOnHoverHandler);
                }
                if(_t._sliderMouseLeaveHandler){
                    un(sliderEl,"mouseleave",_t._sliderMouseLeaveHandler);
                    un(scrollBarEl,"mouseleave",_t._sliderMouseLeaveHandler);
                }
            }
            return _t;
        },
        //绑定滑块hover事件到内容容器
        bindSliderHover4Cont:function(bindContEl){
            var _t = this, contEl = bindContEl || _t._contEl;
            if(contEl){
                _t.createSliderHoverHandler();
                on(contEl,"mouseenter",_t._sliderOnHoverHandler);
                on(contEl,"mouseleave",_t._sliderUnHoverHandler);
            }
            return _t;
        },
        //解除绑定滑块hover事件到内容容器
        unbindSliderHover4Cont:function(bindContEl){
            var _t = this, contEl = bindContEl || _t._contEl;
            if(contEl){
                _t._sliderOnHoverHandler && un(contEl,"mouseenter",_t._sliderOnHoverHandler);
                _t._sliderMouseLeaveHandler && un(contEl,"mouseleave",_t._sliderMouseLeaveHandler);
            }
            return _t;
        },

        //绑定点击滚动条容器触发滚动并重新定位滑块相关事件
        bindScrollBarEvent:function(){
            var _t = this,scrollBarEl = _t._scrollBarEl;
            if(scrollBarEl){
                _t._scrollBarMDHandler = _t._scrollBarMDHandler ||  function(e){
                    _t.scrollToByPagePos(e);
                };
                on(scrollBarEl,"mousedown",_t._scrollBarMDHandler);
            }
            return _t;
        },
        //解除点击滚动条容器触发滚动并重新定位滑块相关事件
        unbindScrollBarEvent:function(){
            var _t = this,scrollBarEl = _t._scrollBarEl;
            scrollBarEl && _t._scrollBarMDHandler && un(scrollBarEl,"mousedown",_t._scrollBarMDHandler);
            return _t;
        },
        //绑定自定义事件（解决CustEvent的on不返回当前对象的问题）
        onCustEvent:function(type,handler){
            this.on(type,handler);
            return this;
        },
        //解绑自定义事件（解决CustEvent的on不返回当前对象的问题）
        unCustEvent:function(type,handler){
            this.on(type,handler);
            return this;
        },

        //为用于模拟的元素绑定原生事件,elName为空则默认为滑块
        onEvent:function(type,handler,elName) {
            elName = elName || "slider"; //slider || cont || scrollBar
            var _t = this, el = _t['_'+elName+'El']||elName;
            el && on(el,type,handler);
            return _t;
        },
        //为用于模拟的元素解绑原生事件,elName为空则默认为滑块
        unEvent:function(type,handler,elName) {
            elName = elName || "slider"; //slider || cont || scrollBar
            var _t = this, el = _t['_'+elName+'El'];
            el && un(el,type,handler);
            return _t;
        },

        _animTimer:null,
        //动画渐进式执行scrollTo
        scrollToAnim:function(toVal,stepTime,animTime,isAwait){
            var _t = this, opts = _t.options;
            if(_t._animTimer){
                if(isAwait==null?opts.scrollAnimAwait:isAwait)return;
                clearTimeout(_t._animTimer);
            }
            stepTime = stepTime||opts.scrollStepTime;
            animTime = animTime||opts.scrollAnimTime;

            var formVal = _t.getScrollPosition(),
                currVal = formVal,
                stepVal= (toVal-formVal)*stepTime/animTime;
            (function(){
                currVal += stepVal;
                if(stepVal<0 ? currVal<toVal : (currVal>toVal) ){
                    currVal = toVal; //当前值已超出目标值则重置为目标值
                }
                _t.scrollTo(currVal);
                _t.fire('scrollToAnim',{currVal:currVal,toVal:toVal});
                if(currVal == toVal){
                    clearTimeout(_t._animTimer);
                    _t._animTimer = null;
                    _t.fire('scrollToAnimEnd',{currVal:currVal,toVal:toVal});
                }else{
                    _t._animTimer = setTimeout(arguments.callee, stepTime);
                }
            })();
            return _t;
        },
        //按照pageXY定位滚动条坐标 scrollPosDiff是滑块操作时候的初始差值
        //如果不传scrollPosDiff则以当前pageXY作为滑块中心点,否则以scrollPosDiff与当前pageXY的差值作为滚动条新坐标
        scrollToByPagePos:function(e,scrollPosDiff){
            var _t = this, pageXY = getPageXY(_t._dir,e);
            _t.scrollTo(_t.getScrollSize()*(pageXY-_t.getScrollBarPosition()-_t.getSliderSize()*.5)/(_t.getScrollBarSize()||1));
            return _t;
        },
        //按差值调整滚动条所在位置
        scrollAdd:function(diffVal){
            var _t = this;
            _t.scrollTo(_t.getScrollPosition()+(diffVal||0));
            return _t;
        },
        //改变滚动条所在位置到positionVal
        scrollTo:function(positionVal){
            var _t = this;
            _t._contEl[_t._stl] = positionVal;
            _t.fire('scroll');
            return _t;
        },
        //取得滚动条所在位置坐标值
        getScrollPosition:function() {
            return this._contEl[this._stl];
        },
        //取得滚动条最大可滚动到的坐标值
        getMaxScrollPosition:function() {
            return this.getScrollSize()-this.getContSize();
        },

        //内容容器高度
        getContSize:function() {
            return this._contEl[this._owh];
        },

        //可滚动内容尺寸
        getScrollSize:function() {
            var _t = this;
            return Math.max(_t.getContSize(),_t._contEl[_t._swh]);
        },

        //滚动条模拟元素尺寸
        getScrollBarSize:function(){
            return this._scrollBarEl[this._owh];
        },

        //滚动条模拟元素坐标
        getScrollBarPosition:function(){
            return getXY(this._scrollBarEl)[_mum[this._dir]];
        },

        //滑块当前应在尺寸
        getSliderSize:function() {
            var _t = this;
            return Math.max(_t.getScrollBarSize()*_t.getContSize()/(_t.getScrollSize()||1),_t.options.sliderMinHeight);
        },

        //滑块最大坐标
        getMaxSliderPosition:function() {
            return this.getScrollBarSize()-this._sliderEl[this._owh];
        },

        //滑块当前应在坐标
        getSliderPosition:function() {
            var _t = this, maxSliderPos = _t.getMaxSliderPosition();
            return Math.min(maxSliderPos*_t.getScrollPosition()/(_t.getMaxScrollPosition()||1),maxSliderPos);
        },

        /** 设置滑块尺寸 **
         * @sizeVal  要调整到的长度尺寸 不传则默认为this.getSliderSize()
         **/
        resizeSlider:function(sizeVal) {
            var _t = this,sliderEl = _t._sliderEl;
            if(sliderEl){
                sizeVal = isNaN(sizeVal)?_t.getSliderSize():sizeVal;
                var sliderDisplay = _t.options.sliderAlwaysShow || sizeVal<_t.getScrollBarSize()?"":"none";
                sliderEl.style.display=sliderDisplay;
                if(sliderDisplay=="none"){
                    _t.fire('sliderHide');
                }
                sliderEl.style[_t._whLCase] = sizeVal+'px';
                _t.fire('resizeSlider');
            }
            return _t;
        },
        /** 设置滑块位置 **
         * @sizeVal  要调整到的长度尺寸 不传则默认为this.getSliderPosition()
         **/
        removeSlider: function(positionVal){
            var _t = this,sliderEl = _t._sliderEl;
            if(sliderEl){
                positionVal = isNaN(positionVal)?_t.getSliderPosition():positionVal;
                sliderEl.style[_t._tlLCase] = positionVal+'px';
                _t.fire('removeSlider');
            }
            return _t;
        }
    });

    window.CusScrollBar = QW.CusScrollBar = CusScrollBar;

})(window,document);