/*
  Copyright 2012 Google Inc. All Rights Reserved.

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

'use strict';

topicExplorerApp.controller('LoggedInCtrl', ['$scope', '$rootScope', 'constants', 'youtube', function($scope, $rootScope, constants, youtube) {
  $scope.thumbnailUrl = constants.DEFAULT_PROFILE_THUMBNAIL;

  youtube({
    method: 'GET',
    service: 'channels',
    params: {
      mine: '',
      part: 'id,snippet'
    },
    callback: function(response) {
      $scope.$apply(function() {
        if ('items' in response) {
          $scope.title = (response.items[0].snippet.title.split(/\W/))[0] || constants.DEFAULT_DISPLAY_NAME;
          $scope.thumbnailUrl = response.items[0].snippet.thumbnails.default.url;
          $rootScope.channelId = response.items[0].id;
        } else {
          $scope.title = constants.DEFAULT_DISPLAY_NAME;
        }
      });
    }
  });

  // Ideally, this will load your subscriptions, then look up each channel and get any associated
  // topics. Unfortunately, this doesn't work due to b/7365866
  /*youtube({
    method: 'GET',
    service: 'subscriptions',
    params: {
      mine: '',
      part: 'snippet'
    },
    cacheTimeoutMinutes: 0,
    callback: function(subscriptionsResponse) {
      var mids = {};

      var channelIds = subscriptionsResponse.subscriptions.map(function(subscription) {
        return subscription.snippet.resourceId.channelId;
      });

      youtube({
        method: 'GET',
        service: 'channels',
        params: {
          part: 'contentDetails,topicDetails',
          id: channelIds.join(','),
          maxResults: constants.YOUTUBE_API_MAX_RESULTS
        },
        callback: function(channelsResponse) {
          console.log(channelsResponse);
        }
      });
    }
  });*/
}]);