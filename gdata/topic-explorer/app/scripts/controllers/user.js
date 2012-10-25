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

topicExplorerApp.controller('UserCtrl', ['$scope', '$rootScope', '$http', '$window', 'constants', function($scope, $rootScope, $http, $window, constants) {
  var loggedOutTemplate = 'views/logged-out.html';
  var loggedInTemplate = 'views/logged-in.html';

  $scope.template = loggedOutTemplate;

  $window[constants.GOOGLE_APIS_CLIENT_CALLBACK] = function() {
    gapi.client.setApiKey(constants.API_KEY);
    setTimeout(function() {
      gapi.auth.authorize({
        client_id: constants.OAUTH2_CLIENT_ID,
        scope: constants.OAUTH2_SCOPES,
        immediate: true
      }, handleAuthResult);
    }, 1);
  };

  function handleAuthResult(authResult) {
    $scope.$apply(function() {
      if (authResult && !authResult.error) {
        $scope.template = loggedInTemplate;
      } else {
        $scope.template = loggedOutTemplate;
      }
    });
  }

  $scope.login = function() {
    gapi.auth.authorize({
      client_id: constants.OAUTH2_CLIENT_ID,
      scope: constants.OAUTH2_SCOPES,
      immediate: false
    }, handleAuthResult);
  };

  $rootScope.logout = function() {
    lscache.flush();
    $rootScope.channelId = null;
    $scope.template = loggedOutTemplate;
    $http.jsonp(constants.OAUTH2_REVOKE_URL + gapi.auth.getToken().access_token);
  };

  $http.jsonp(constants.GOOGLE_APIS_CLIENT_URL + constants.GOOGLE_APIS_CLIENT_CALLBACK);
}]);