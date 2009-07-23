package com.google.tchotchke;

import java.io.IOException;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Simple servlet to handle logging a user out.
 *
 */
@SuppressWarnings("serial")
public class LogoutServlet extends HttpServlet {
  @Override
  public void doGet(HttpServletRequest req, HttpServletResponse resp)
      throws IOException {

    SessionManager sessionManager = new SessionManager(req, resp);
    sessionManager.destroySession();

  }
}
