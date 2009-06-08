-- phpMyAdmin SQL Dump
-- version 2.10.3
-- http://www.phpmyadmin.net
-- 
-- Host: localhost
-- Generation Time: May 04, 2009 at 02:52 PM
-- Server version: 5.0.51
-- PHP Version: 5.2.4-2ubuntu5.5

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";

-- 
-- Database: `uberviewer`
-- 

-- --------------------------------------------------------

-- 
-- Table structure for table `activity`
-- 

CREATE TABLE `activity` (
  `id` bigint(20) unsigned NOT NULL auto_increment,
  `updated` datetime NOT NULL,
  `json` text NOT NULL,
  `username` varchar(20) NOT NULL,
  `ytid` varchar(100) NOT NULL,
  PRIMARY KEY  (`id`),
  UNIQUE KEY `ytid` (`ytid`),
  KEY `updated` (`updated`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

-- 
-- Table structure for table `user`
-- 

CREATE TABLE `user` (
  `id` bigint(20) unsigned NOT NULL auto_increment,
  `username` varchar(20) NOT NULL,
  `hash` varchar(12) NOT NULL,
  `etag` varchar(60) default NULL,
  `feedUpdated` varchar(30) default NULL,
  PRIMARY KEY  (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `hash` (`hash`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

