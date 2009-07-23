package com.google.tchotchke;

import javax.jdo.JDOHelper;
import javax.jdo.PersistenceManagerFactory;

/**
 * Crazy static class provided by Google App Engine documentation since
 * creating a PersistenceManagerFactory is extremely expensive.
 */
public class PMF {

  private static final PersistenceManagerFactory pmfInstance =
    JDOHelper.getPersistenceManagerFactory("transactions-optional");
  
  private PMF() {}
  
  public static PersistenceManagerFactory get() {
    return pmfInstance;
  }
}
