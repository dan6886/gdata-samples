class ContactsController < ApplicationController
  before_filter :setup_client
  
  CONTACTS_FEED = CONTACTS_SCOPE + 'contacts/default/full/'
  
  def all
    if !request.xhr?
      redirect_to :controller => 'doclist', :action => 'documents' and return
    end
    
    feed = @client.get(CONTACTS_FEED +
                       "?max-results=#{MAX_CONTACTS_RESULTS.to_s}")

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
    
    groups_feed = @client.get(CONTACTS_SCOPE + 'groups/default/full/');
    group_id = my_contacts_group_id(groups_feed)
    url = CONTACTS_FEED +
          "?group=#{group_id}&max-results=#{MAX_CONTACTS_RESULTS.to_s}"
    feed = @client.get(url)
    
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