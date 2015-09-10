'use strict';

var _ = require('lodash');

function Scroller(targetElement, options) {
  this.lines = options.lines || [];
  this.lineOffset = options.lineOffset || 0;
  this.visibleCount = options.visibleCount || 50;
  this.startPosition = options.startPosition || 0;
  this.endPosition = options.endPosition || 0;
  this.expandDistance = options.expandDistance || 200;
  this.sticky = options.sticky || true;
  this.jumpToBottom = this.sticky;

  this.target = targetElement;

  this.animateRequest = null;
  this.dirty = true;

  //pre-bind functions
  this.refresh = this._renderVisible.bind(this);
  this.scroll = this._onScroll.bind(this);
  this.expandTop = this._expandTop.bind(this);
  this.expandBottom = this._expandBottom.bind(this);
}

Scroller.prototype._generateContent = function(){
  return _(this.lines)
    .slice(this.startPosition - this.lineOffset, this.endPosition - this.lineOffset)
    .map(function(line){
      if(line.length === 0){
        // insert a blank space to prevent pre omitting a trailing newline,
        // even though pre/pre-nowrap/pre-line are specified.
        return '\u2009';
      }
      return line;
    })
    .join('\n');
};

Scroller.prototype.setLines = function(newLines, offset) {
  this.lines = newLines;
  this.lineOffset = offset;
  if(this.sticky){
    this.endPosition = this.lineCount();
    this.startPosition = Math.max(this.lineOffset, this.endPosition - this.visibleCount);
    if(this.endPosition <= this.visibleCount * 2){
      // follow text during initial lines (target can show up to twice the visibleCount when expanding)
      this.jumpToBottom = true;
    }
  }else if(this.lineOffset > this.startPosition){
    // when buffer trims and we are now below the trimmed area, move up by difference
    var lineDiff = this.lineOffset - this.startPosition;
    this.startPosition += lineDiff;
    this.endPosition += lineDiff;
  }
  this.dirty = true;
};

Scroller.prototype.lineCount = function(){
  return this.lines.length + this.lineOffset;
};

Scroller.prototype.reset = function(){
  this.endPosition = Math.max(0, this.lineCount());
  this.startPosition = Math.max(0, this.endPosition - this.visibleCount);
  this.lineOffset = 0;
  this.jumpToBottom = true;
  this.sticky = true;
  this.dirty = true;
};

Scroller.prototype.requestRefresh = function(){
  if(this.target){
    this.animateRequest = requestAnimationFrame(this.refresh);
  }
};

Scroller.prototype._renderVisible = function(){
  this.animateRequest = null;
  if(this.dirty && this.target){
    if(this.sticky){
      this.endPosition = this.lineCount();
      this.startPosition = Math.max(this.lineOffset, this.endPosition - this.visibleCount);
    }
    this.target.innerHTML = this._generateContent();
    if(this.jumpToBottom){
      this.target.scrollTop = 4000;
      this.jumpToBottom = false;
    }
    this.dirty = false;
  }
};

Scroller.prototype._expandTop = function(){
  this.startPosition = Math.max(this.lineOffset, this.startPosition - this.visibleCount);
  if(this.target){
    this.sticky = false;
    var scrollHeight = this.target.scrollHeight;
    var scrollTop = this.target.scrollTop;

    // do an inline scroll to avoid potential scroll interleaving
    this.target.innerHTML = this._generateContent();
    var newScrollHeight = this.target.scrollHeight;
    this.target.scrollTop = scrollTop + newScrollHeight - scrollHeight;

    var oldEndPos = this.endPosition;
    this.endPosition = Math.min(this.endPosition, this.startPosition + (this.visibleCount * 2));

    this.dirty = oldEndPos !== this.endPosition;
    if(this.dirty && !this.animateRequest){
      this.animateRequest = requestAnimationFrame(this.refresh);
    }
  }
};

Scroller.prototype._expandBottom = function(){
  this.endPosition = Math.min(this.lineCount(), this.endPosition + this.visibleCount);
  if(this.target){
    // add the new content to the bottom, then get scroll position to remove content
    this.target.innerHTML = this._generateContent();
    var scrollHeight = this.target.scrollHeight;
    var scrollTop = this.target.scrollTop;

    // update start position and render
    this.startPosition = Math.max(this.lineOffset, Math.min(this.lineCount() - (this.visibleCount * 2), this.endPosition - (this.visibleCount * 2)));
    this.target.innerHTML = this._generateContent();

    // use difference to scroll offset
    var newScrollHeight = this.target.scrollHeight;
    this.target.scrollTop = scrollTop - (scrollHeight - newScrollHeight);

    this.dirty = false;
  }
};

Scroller.prototype._onScroll = function(){
  if(this.jumpToBottom){
    // do nothing, prepare to jump
    return;
  }
  var height = this.target.offsetHeight;
  var scrollHeight = this.target.scrollHeight;
  var scrollTop = this.target.scrollTop;
  var nearTop = scrollTop < this.expandDistance;
  var nearBottom = scrollTop + height > scrollHeight - this.expandDistance;
  var nearSticky = scrollTop + height > scrollHeight - 10;

  if(this.sticky){
    if(!nearSticky){
      this.sticky = false;
    }
  }else{
    if(nearTop && this.startPosition > this.lineOffset){
      this.expandTop();
    }else if(nearBottom){
      if(this.endPosition < this.lineCount() - 2){
        this.expandBottom();
      }else if(nearSticky){
        this.jumpToBottom = true;
        this.sticky = true;
        this.dirty = true;
      }
    }
  }

  

  if(this.dirty && !this.animateRequest){
    this.animateRequest = requestAnimationFrame(this.refresh);
  }
};

module.exports = Scroller;
