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

class DoclistController < ApplicationController
  layout 'standard'
  before_filter :setup_client, :set_user_email
  
  def all
    url = params[:url] ? params[:url] + "/-/#{MINE_LABEL}" :
                         DOCLIST_FEED + "/-/#{MINE_LABEL}/#{DOCUMENT_DOC_TYPE}"
    url += '?showfolders=true'
    
    begin
      feed = @client.get(url).to_xml
      @documents = create_docs(feed)
    rescue GData::Client::AuthorizationError
      logout
    end
    
    @doc_type = DOCUMENT_DOC_TYPE

    if !request.xhr?
      render :action => 'documents'
    else
      render :partial => 'documents_list'
    end
  end
  
  def documents
    begin
      url = DOCLIST_FEED + "/-/#{MINE_LABEL}/#{DOCUMENT_DOC_TYPE}"
      feed = @client.get(url).to_xml
      @documents = create_docs(feed)
    rescue GData::Client::AuthorizationError
      logout
    end
    
    @doc_type = DOCUMENT_DOC_TYPE
    
    if request.xhr?
      render :partial => 'documents_list'
    end
  end
  
  def spreadsheets
    begin
      url = DOCLIST_FEED + "/-/#{MINE_LABEL}/#{SPREADSHEET_DOC_TYPE}"
      feed = @client.get(url).to_xml
      @documents = create_docs(feed)
    rescue GData::Client::AuthorizationError
      logout
    end
    
    @doc_type = SPREADSHEET_DOC_TYPE
    
    if !request.xhr?
      render :action => 'documents'
    else
      render :partial => 'documents_list'
    end
  end
  
  def presentations
    begin
      url = DOCLIST_FEED + "/-/#{MINE_LABEL}/#{PRESO_DOC_TYPE}"
      feed = @client.get(url).to_xml
      @documents = create_docs(feed)
    rescue GData::Client::AuthorizationError
      logout
    end
    
    @doc_type = PRESO_DOC_TYPE
    
    if !request.xhr?
      render :action => 'documents'
    else
      render :partial => 'documents_list'
    end
  end
  
  def pdfs
    begin
      url = DOCLIST_FEED + "/-/#{MINE_LABEL}/#{PDF_DOC_TYPE}"
      feed = @client.get(url).to_xml
      @documents = create_docs(feed)
    rescue GData::Client::AuthorizationError
      logout
    end

    @doc_type = PDF_DOC_TYPE

    if !request.xhr?
      render :action => 'documents'
    else
      render :partial => 'documents_list'
    end
  end
  
  def folders
    begin
      url = DOCLIST_FEED + "/-/#{FOLDER_DOC_TYPE}?showfolders=true"
      feed = @client.get(url).to_xml
      @documents = create_docs(feed)
    rescue GData::Client::AuthorizationError
      logout
    end
    
    @doc_type = FOLDER_DOC_TYPE
    
    if !request.xhr?
      render :action => 'documents'
    else
      render :partial => 'documents_list'
    end
  end
  
  def starred
    begin
      url = DOCLIST_FEED + "/-/#{MINE_LABEL}/#{STARRED_LABEL}?showfolders=true"
      feed = @client.get(url).to_xml
      @documents = create_docs(feed)
    rescue GData::Client::AuthorizationError
      logout
    end
    
    @doc_type = DOCUMENT_DOC_TYPE

    if !request.xhr?
      render :action => 'documents'
    else
      render :partial => 'documents_list'
    end
  end
  
  def trashed
    begin
      url = DOCLIST_FEED + "/-/#{MINE_LABEL}/#{TRASHED_LABEL}?showfolders=true"
      feed = @client.get(url).to_xml
      @documents = create_docs(feed)
    rescue GData::Client::AuthorizationError
      logout
    end
    
    @doc_type = DOCUMENT_DOC_TYPE

    if !request.xhr?
      render :action => 'documents'
    else
      render :partial => 'documents_list'
    end
  end
  
  def show
    # expandAcl projection will inline the ACLs in the resulting feed
    url = params[:url].sub(/\/full/, '/expandAcl')
    
    entry = @client.get(url).to_xml
    @document = create_doc(entry)
    if @document.type == DOCUMENT_DOC_TYPE
      export_url = @document.links['export'] + '&exportFormat=png'
      # Src value for an imaging containing a data URI
      @preview_img = Base64.encode64(download(export_url))
    end
    render :partial => 'show'
  end
  
  def download(export_url=nil)
    export_url ||= params[:export_url]
 
    resp = @client.get(export_url)

    # Set our response headers based on those returned with the file.
    headers['content-type'] = resp.headers['content-type']
    headers['content-disposition'] = resp.headers['content-disposition']
    
    if params[:export_url]
      render :text => resp.body
    else
      return resp.body
    end
  end
  
  def set_acls
    return unless request.xhr?

    @html, @errors = [], []
    @role = params[:role] || 'writer'

    if !params[:emails].nil?
      for email in params[:emails]
        entry = <<-EOF
          <entry xmlns='http://www.w3.org/2005/Atom'
                 xmlns:gAcl='http://schemas.google.com/acl/2007'>
            <category scheme='http://schemas.google.com/g/2005#kind'
                      term='http://schemas.google.com/acl/2007#accessRule'/>
            <gAcl:role value='#{@role}'/>
            <gAcl:scope type='user' value='#{email}'/>
          </entry>
        EOF
        begin
          resp = @client.post(params[:acl_feedlink], entry)
          @html.push("<li>#{email}</li>")
        rescue
          @errors.push(email)
        end
      end
    else
      render :update do |page|
        page.call "$('save_loading').toggleClassName", 'hidden'
        page.alert "You didn't select anyone to be a #{@role}"
      end
    end
  end
  
  def logout
    @client.auth_handler.revoke
    session[:users_email] = nil
    session[:token] = nil

    redirect_to '/'
  end
  
private

  def set_user_email
    # Query feed to fetch user's email
    if session[:users_email].nil?
      feed = @client.get(DOCLIST_FEED + '?max-results=0').to_xml
      session[:users_email] = feed.elements['author/email'].text
    end
  end
  
  def doc_type(entry)
    entry.each_element_with_attribute('scheme',
                                      'http://schemas.google.com/g/2005#kind',
                                      0, 'category') do |category|
      return category.attributes['label']
    end
  end
  
  def create_doc(entry)
    doc = GDoc::Document.new(entry.elements['title'].text,
                             :type => doc_type(entry),
                             :xml => entry.to_s)
    # Extract the document/spreadsheet/presentation id from the <atom:id>
    doc.doc_id = entry.elements['id'].text[/#{doc.type}%3[aA](.*)\/?$/, 1]

    doc.last_updated = DateTime.parse(entry.elements['updated'].text)
    
    entry.elements.each('link') do |link|
      doc.links[link.attributes['rel']] = link.attributes['href']
    end
    doc.links['acl_feedlink'] = entry.elements['gd:feedLink'].attributes['href']
    doc.links['content_src'] = entry.elements['content'].attributes['src']

    case doc.type
      when DOCUMENT_DOC_TYPE, PRESO_DOC_TYPE
        doc.links['export'] = DOCLIST_SCOPE +
                              "download/documents/Export?docID=#{doc.doc_id}"
      when SPREADSHEET_DOC_TYPE
        doc.links['export'] = SPREADSHEETS_SCOPE +
                              "download/spreadsheets/Export?key=#{doc.doc_id}"
    end
    
    entry.elements.each('gd:feedLink/feed/entry') do |feedlink_entry|
      email = feedlink_entry.elements['gAcl:scope'].attributes['value']
      role = feedlink_entry.elements['gAcl:role'].attributes['value']
      doc.add_permission(email, role)
    end
    return doc
  end
  
  def create_docs(feed)
    documents = []
    feed.elements.each('entry') do |entry|
      doc = create_doc(entry)
      documents.push(doc) if !doc.nil?
    end
    return documents
  end
  
end