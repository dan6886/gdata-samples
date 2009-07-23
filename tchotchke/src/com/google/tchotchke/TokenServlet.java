package com.google.tchotchke;

import java.io.IOException;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Super simple class to handle doing the AuthSub token exchange to upgrade
 * a one-time token into a session token.
 *
 */
@SuppressWarnings("serial")
public class TokenServlet extends HttpServlet {
  
  @Override
  public void doGet(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {
    
    SessionManager sessionManager = new SessionManager(req, resp);
    sessionManager.upgradeToken();
  }
}
