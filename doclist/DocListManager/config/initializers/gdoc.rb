#!/usr/bin/ruby
#
# Copyright:: Copyright 2009 Google Inc.
# License:: All Rights Reserved.
# Original Author:: Eric Bidelman (mailto:e.bidelman@google.com)
#
# Module for representing a Google Document.
#
# This module provides a class for easily manipulating a document
# created from the xml of a Google Documents List API query.
#
#    Document: Class for representing a document and its properties.


module GDoc

  class Document
  
    attr_reader :permissions, :xml
    attr_accessor :title, :doc_id, :type, :last_updated, :links

    # Initializer.
    #
    # Args:
    # - title: string Title of the document
    # - options: hash of options
    #            valid options: +type+: string The type of document. Possible
    #                                   values are 'document', 'presentation',
    #                                   'spreadsheet', 'folder', 'pdf'
    #                           +last_updated+: DateTime
    #                           +xml+: string An XML representation of this doc
    #
    def initialize(title, options={})
      @title = title
      @links = {}
      @type = options[:type] || ''
      @last_updated = options[:last_updated] || DateTime.new
      @xml = options[:xml] || nil
      @permissions = {'owner' => [], 'reader' => [], 'writer' => []}
    end

    def add_permission(email, role)
      role.downcase!
      return if !@permissions.has_key?(role)

      if email.class == String
        @permissions[role].push(email)
      elsif email.class == Array
        @permissions[role] = @permissions[role] | email
      end
      @permissions[role].uniq!
    end

    def <=>(document)
      @title.casecmp(document.title) # need case-insensitive version of <=>
    end

    def to_s
      [@title, ", doc_id: #{@doc_id} (#{@type})",
      "\nlinks: #{@links.inspect}",
      "\npermissions:\n#{@permissions.inspect}"].join
    end

    def to_xml
      @xml
    end

    def inspect
      self.to_s
    end
  end

end
