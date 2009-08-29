# Copyright (C) 2009 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Filters added to this controller apply to all controllers in the application.
# Likewise, all the methods added will be available for all controllers.

class ApplicationController < ActionController::Base
  helper :all # include all helpers, all the time

  # See ActionController::RequestForgeryProtection for details
  # Uncomment the :secret if you're not using the cookie session store
  protect_from_forgery # :secret => 'af4aff7d9a8afecefec9c3be83da6537'

  # See ActionController::Base for details
  # Uncomment this to filter the contents of submitted sensitive data parameters
  # from your application log (in this case, all fields with names like "password").
  # filter_parameter_logging :password

  DOCLIST_SCOPE = 'http://docs.google.com/feeds/'
  DOCLIST_DOWNLOD_SCOPE = 'http://docs.googleusercontent.com/'
  CONTACTS_SCOPE = 'http://www.google.com/m8/feeds/'
  SPREADSHEETS_SCOPE = 'http://spreadsheets.google.com/feeds/'

  DOCLIST_FEED = DOCLIST_SCOPE + 'default/private/full'

  DOCUMENT_DOC_TYPE = 'document'
  FOLDER_DOC_TYPE = 'folder'
  PRESO_DOC_TYPE = 'presentation'
  PDF_DOC_TYPE = 'pdf'
  SPREADSHEET_DOC_TYPE = 'spreadsheet'
  MINE_LABEL = 'mine'
  STARRED_LABEL = 'starred'
  TRASHED_LABEL = 'trashed'

  MAX_CONTACTS_RESULTS = 500

  private

  def setup_client
    scopes = [DOCLIST_SCOPE, DOCLIST_DOWNLOD_SCOPE,
              SPREADSHEETS_SCOPE, CONTACTS_SCOPE]
    @client = GData::Client::DocList.new({:authsub_scope => scopes.join(' '),
                                          :source => 'google-DocListManager-v1.1',
                                          :version => '3.0'})

    if params[:token].nil? and session[:token].nil?
      next_url = url_for :controller => self.controller_name, :action => self.action_name
      secure = false
      @authsub_link = @client.authsub_url(next_url, secure, true)
      render :controller => 'doclist', :action => 'documents'
    elsif params[:token] and session[:token].nil?
      @client.authsub_token = params[:token]
      session[:token] = @client.auth_handler.upgrade()
    end

    @client.authsub_token = session[:token] if session[:token]
  end

end
