package com.google.tchotchke;

import java.io.IOException;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@SuppressWarnings("serial")
public class TokenServlet extends HttpServlet {
  public void doGet(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {
    
    SessionManager sessionManager = new SessionManager(req, resp);
    sessionManager.upgradeToken();
    
  }
}
