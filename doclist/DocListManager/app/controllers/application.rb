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
  CONTACTS_SCOPE = 'http://www.google.com/m8/feeds/'
  SPREADSHEETS_SCOPE = 'http://spreadsheets.google.com/feeds/'
  
  DOCLIST_FEED = DOCLIST_SCOPE + 'documents/private/full'
  
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
    scopes = [DOCLIST_SCOPE, SPREADSHEETS_SCOPE, CONTACTS_SCOPE]
    @client = GData::Client::Base.new({:authsub_scope => scopes.join(' '),
                                       :source => 'google-DocListManager-v1'})

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
