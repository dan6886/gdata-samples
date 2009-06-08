package com.google.youtube.example.uberactivityviewer;

@SuppressWarnings("serial")
public class BadConfigurationException extends Exception {

  public BadConfigurationException(String message) {
    super(message);
  }

  public BadConfigurationException(String message, Throwable cause) {
    super(message, cause);
  }

}
