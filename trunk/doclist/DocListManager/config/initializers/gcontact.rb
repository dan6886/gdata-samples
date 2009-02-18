#!/usr/bin/ruby
#
# Copyright:: Copyright 2009 Google Inc.
# License:: All Rights Reserved.
# Original Author:: Eric Bidelman (mailto:e.bidelman@google.com)
#
# Module for representing a Google Contact.
#
# This module provides a class for easily manipulating a contact
# created from the xml of a Google Contacts API query.
#
#    Contact: Class for representing a contact and its properties.


module GContact

  class Contact
  
    attr_accessor :name, :email

    def initialize(name = nil, email=nil, xml=nil)
      @name, @email, @xml = name, email, xml
    end
    
    def <=>(contact)
      if !contact.email.nil? and !@email.nil?
        @email.casecmp(contact.email) # case-insensitive version of <=>
      else
        -1
      end
    end

    def to_s
      str = ''
      str += "#{@name}, " if @name
      str += @email
      return str
    end
    
    def to_xml
      @xml
    end
    
    def inspect
      self.to_s
    end
  end

end
