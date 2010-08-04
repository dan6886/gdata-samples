/*
Copyright 2009 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package com.google.youtube.examples {
  import flash.events.Event;
  import flash.events.IOErrorEvent;
  import flash.events.MouseEvent;
  import flash.net.URLLoader;
  import flash.net.URLRequest;
  import flash.net.URLVariables;
  import flash.system.Security;
  import mx.containers.Canvas;
  import mx.controls.Button;
  import mx.controls.ComboBox;
  import mx.controls.SWFLoader;
  import mx.controls.TextInput;
  import mx.events.ListEvent;

  public class AS3Player extends Canvas {
    // Member variables.
    private var cueButton:Button;
    private var isQualityPopulated:Boolean;
    private var isWidescreen:Boolean;
    private var pauseButton:Button;
    private var playButton:Button;
    private var player:Object;
    private var playerLoader:SWFLoader;
    private var qualityComboBox:ComboBox;
    private var videoIdTextInput:TextInput;
    private var youtubeApiLoader:URLLoader;

    // CONSTANTS.
    private static const DEFAULT_VIDEO_ID:String = "0QRO3gKj3qw";
    private static const PLAYER_URL:String =
        "http://www.youtube.com/apiplayer?version=3";
    private static const SECURITY_DOMAIN:String = "http://www.youtube.com";
    private static const YOUTUBE_API_PREFIX:String =
        "http://gdata.youtube.com/feeds/api/videos/";
    private static const YOUTUBE_API_VERSION:String = "2";
    private static const YOUTUBE_API_FORMAT:String = "5";
    private static const WIDESCREEN_ASPECT_RATIO:String = "widescreen";
    private static const QUALITY_TO_PLAYER_WIDTH:Object = {
      small: 320,
      medium: 640,
      large: 854,
      hd720: 1280
    };
    private static const STATE_ENDED:Number = 0;
    private static const STATE_PLAYING:Number = 1;
    private static const STATE_PAUSED:Number = 2;
    private static const STATE_CUED:Number = 5;

    public function AS3Player():void {
      // Specifically allow the chromless player .swf access to our .swf.
      Security.allowDomain(SECURITY_DOMAIN);

      setupUi();
      setupPlayerLoader();
      setupYouTubeApiLoader();
    }

    private function setupUi():void {
      // Create a TextInput field for the YouTube video id, and pre-populate it.
      videoIdTextInput = new TextInput();
      videoIdTextInput.text = DEFAULT_VIDEO_ID;
      videoIdTextInput.width = 100;
      videoIdTextInput.x = 10;
      videoIdTextInput.y = 10;
      addChild(videoIdTextInput);

      // Create a Button for cueing up the video whose id is specified.
      cueButton = new Button();
      cueButton.enabled = false;
      cueButton.label = "Cue Video";
      cueButton.width = 100;
      cueButton.x = 120;
      cueButton.y = 10;
      cueButton.addEventListener(MouseEvent.CLICK, cueButtonClickHandler);
      addChild(cueButton);

      // Create a ComboBox that will contain the list of available playback
      // qualities. Selecting from the ComboBox will change the playback quality
      // and resize the player. Note that playback qualities are only available
      // once a video has started playing, so the values in this ComboBox can't
      // be populated until then.
      qualityComboBox = new ComboBox();
      qualityComboBox.prompt = "n/a";
      qualityComboBox.width = 100;
      qualityComboBox.x = 230;
      qualityComboBox.y = 10;
      qualityComboBox.addEventListener(ListEvent.CHANGE,
                                       qualityComboBoxChangeHandler);
      addChild(qualityComboBox);

      // Create a Button for playing the cued video.
      playButton = new Button();
      playButton.enabled = false;
      playButton.label = "Play";
      playButton.width = 100;
      playButton.x = 340;
      playButton.y = 10;
      playButton.addEventListener(MouseEvent.CLICK, playButtonClickHandler);
      addChild(playButton);

      // Create a Button for pausing the cued video.
      pauseButton = new Button();
      pauseButton.enabled = false;
      pauseButton.label = "Pause";
      pauseButton.width = 100;
      pauseButton.x = 450;
      pauseButton.y = 10;
      pauseButton.addEventListener(MouseEvent.CLICK, pauseButtonClickHandler);
      addChild(pauseButton);
    }

    private function setupPlayerLoader():void {
      playerLoader = new SWFLoader();
      playerLoader.addEventListener(Event.INIT, playerLoaderInitHandler);
      playerLoader.load(PLAYER_URL);
    }

    private function playerLoaderInitHandler(event:Event):void {
      addChild(playerLoader);
      playerLoader.content.addEventListener("onReady", onPlayerReady);
      playerLoader.content.addEventListener("onError", onPlayerError);
      playerLoader.content.addEventListener("onStateChange",
                                            onPlayerStateChange);
      playerLoader.content.addEventListener("onPlaybackQualityChange",
                                            onVideoPlaybackQualityChange);
    }

    private function setupYouTubeApiLoader():void {
      youtubeApiLoader = new URLLoader();
      youtubeApiLoader.addEventListener(IOErrorEvent.IO_ERROR,
                                        youtubeApiLoaderErrorHandler);
      youtubeApiLoader.addEventListener(Event.COMPLETE,
                                        youtubeApiLoaderCompleteHandler);
    }

    private function youtubeApiLoaderCompleteHandler(event:Event):void {
      var atomData:String = youtubeApiLoader.data;

      // Parse the YouTube API XML response and get the value of the
      // aspectRatio element.
      var atomXml:XML = new XML(atomData);
      var aspectRatios:XMLList = atomXml..*::aspectRatio;

      isWidescreen = aspectRatios.toString() == WIDESCREEN_ASPECT_RATIO;

      isQualityPopulated = false;
      // Cue up the video once we know whether it's widescreen.
      // Alternatively, you could start playing instead of cueing with
      // player.loadVideoById(videoIdTextInput.text);
      player.cueVideoById(videoIdTextInput.text);
    }

    private function qualityComboBoxChangeHandler(event:Event):void {
      var qualityLevel:String = ComboBox(event.target).selectedLabel;
      player.setPlaybackQuality(qualityLevel);
    }

    private function cueButtonClickHandler(event:MouseEvent):void {
      var request:URLRequest = new URLRequest(YOUTUBE_API_PREFIX +
                                              videoIdTextInput.text);

      var urlVariables:URLVariables = new URLVariables();
      urlVariables.v = YOUTUBE_API_VERSION;
      urlVariables.format = YOUTUBE_API_FORMAT;
      request.data = urlVariables;

      try {
        youtubeApiLoader.load(request);
      } catch (error:SecurityError) {
        trace("A SecurityError occurred while loading", request.url);
      }
    }

    private function playButtonClickHandler(event:MouseEvent):void {
      player.playVideo();
    }

    private function pauseButtonClickHandler(event:MouseEvent):void {
      player.pauseVideo();
    }

    private function youtubeApiLoaderErrorHandler(event:IOErrorEvent):void {
      trace("Error making YouTube API request:", event);
    }

    private function onPlayerReady(event:Event):void {
      player = playerLoader.content;
      player.visible = false;

      cueButton.enabled = true;
    }

    private function onPlayerError(event:Event):void {
      trace("Player error:", Object(event).data);
    }

    private function onPlayerStateChange(event:Event):void {
      trace("State is", Object(event).data);

      switch (Object(event).data) {
        case STATE_ENDED:
          playButton.enabled = true;
          pauseButton.enabled = false;
          break;

        case STATE_PLAYING:
          playButton.enabled = false;
          pauseButton.enabled = true;

          if(!isQualityPopulated) {
            populateQualityComboBox();
          }
          break;

        case STATE_PAUSED:
          playButton.enabled = true;
          pauseButton.enabled = false;
          break;

        case STATE_CUED:
          playButton.enabled = true;
          pauseButton.enabled = false;

          resizePlayer("medium");
          break;
      }
    }

    private function onVideoPlaybackQualityChange(event:Event):void {
      trace("Current video quality:", Object(event).data);
      resizePlayer(Object(event).data);
    }

    private function resizePlayer(qualityLevel:String):void {
      var newWidth:Number = QUALITY_TO_PLAYER_WIDTH[qualityLevel] || 640;
      var newHeight:Number;

      if (isWidescreen) {
        // Widescreen videos (usually) fit into a 16:9 player.
        newHeight = newWidth * 9 / 16;
      } else {
        // Non-widescreen videos fit into a 4:3 player.
        newHeight = newWidth * 3 / 4;
      }

      trace("isWidescreen is", isWidescreen, ". Size:", newWidth, newHeight);
      player.setSize(newWidth, newHeight);

      // Center the resized player on the stage.
      player.x = (stage.stageWidth - newWidth) / 2;
      player.y = (stage.stageHeight - newHeight) / 2;

      player.visible = true;
    }

    private function populateQualityComboBox():void {
      isQualityPopulated = true;

      var qualities:Array = player.getAvailableQualityLevels();
      qualityComboBox.dataProvider = qualities;

      var currentQuality:String = player.getPlaybackQuality();
      qualityComboBox.selectedItem = currentQuality;
    }
  }
}