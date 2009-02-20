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

class ContactsController < ApplicationController
  before_filter :setup_client
  
  CONTACTS_FEED = CONTACTS_SCOPE + 'contacts/default/full/'
  
  def all
    if !request.xhr?
      redirect_to :controller => 'doclist', :action => 'documents' and return
    end
    
    feed = @client.get(CONTACTS_FEED +
                       "?max-results=#{MAX_CONTACTS_RESULTS.to_s}").to_xml

    @contacts = []
    feed.elements.each('entry') do |entry|
      contact = GContact::Contact.new(entry.elements['title'].text, nil,
                                      entry.to_s)
      entry.elements.each('gd:email') do |email|
        if email.attribute('primary')
          contact.email = email.attribute('address').value
        end
      end
      @contacts.push(contact)
    end
    @acl_feedlink = params[:acl_feedlink]
  end
  
  def my_contacts
    if !request.xhr?
      redirect_to :controller => 'doclist', :action => 'documents' and return
    end
    
    groups_feed = @client.get(CONTACTS_SCOPE + 'groups/default/full/').to_xml
    group_id = my_contacts_group_id(groups_feed)
    url = CONTACTS_FEED +
          "?group=#{group_id}&max-results=#{MAX_CONTACTS_RESULTS.to_s}"
    feed = @client.get(url).to_xml
    
    session[:users_email] = feed.elements['id'].text if !session[:users_email]
    
    @contacts = []
    feed.elements.each('entry') do |entry|
      contact = GContact::Contact.new(entry.elements['title'].text, nil,
                                      entry.to_s)
      entry.elements.each('gd:email') do |email|
        if email.attribute('primary')
          contact.email = email.attribute('address').value
        end
      end
      @contacts.push(contact)
    end
    @acl_feedlink = params[:acl_feedlink]
    render :action => 'all'
  end
  
private

  def my_contacts_group_id(feed)
    feed.elements.each('entry') do |entry|
      entry.each_element_with_attribute('id', 'Contacts', 0,
                                        'gContact:systemGroup') do |e|
        return e.parent.elements['id'].text
      end
    end
  end
  
end