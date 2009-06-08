package com.google.youtube.example.uberactivityviewer;

@SuppressWarnings("serial")
public class ApiException extends Exception {

  public ApiException(String message) {
    super(message);
  }

  public ApiException(String message, Throwable cause) {
    super(message, cause);
  }

}
