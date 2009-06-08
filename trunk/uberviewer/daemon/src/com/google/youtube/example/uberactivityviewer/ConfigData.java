package com.google.youtube.example.uberactivityviewer;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Properties;

import org.apache.log4j.Logger;
import org.apache.log4j.PropertyConfigurator;

public class ConfigData {
  
  private static Logger log = Logger.getLogger(ConfigData.class);
  
  private Properties configFile;
  
  private int shutdownPort;
  private int activityThreadCount;
  
  private String dbUsername;
  private String dbPassword;
  private String dbHostname;
  private String dbName;
  private String clientId;
  private String devKey;
  
  public ConfigData() {
    this.configFile = new Properties();
  }
  
  private String fetchProperty(String property) throws BadConfigurationException {
    String value = configFile.getProperty(property);
    if(value == null) {
      throw new BadConfigurationException("Config file missing " + property);
    } else {
      return value;
    }
  }
  
  private int fetchIntegerProperty(String property) throws BadConfigurationException {
    try {
      int value = Integer.parseInt(fetchProperty(property));
      return value;
    } catch (NumberFormatException e) {
      throw new BadConfigurationException("Invalid config value for " + property);
    }
  }
  
  public void parseConfigFile(String configFilePath) throws BadConfigurationException {
    try {
      FileInputStream is = new FileInputStream(configFilePath);
      configFile.load(is);
      
      String logConfig = fetchProperty("LOG_CONFIGURATION");
      PropertyConfigurator.configure(logConfig);
      log.info("Starting up...");
      shutdownPort = fetchIntegerProperty("SHUTDOWN_PORT");
      activityThreadCount = fetchIntegerProperty("ACTIVITY_THREAD_COUNT");
      dbUsername = fetchProperty("DB_USERNAME");
      dbPassword = fetchProperty("DB_PASSWORD");
      dbHostname = fetchProperty("DB_HOSTNAME");
      dbName = fetchProperty("DB_NAME");
      clientId = fetchProperty("CLIENT_ID");
      devKey = fetchProperty("DEVELOPER_KEY");
      
    } catch (FileNotFoundException e) {
      throw new BadConfigurationException("Can't find provided configuration file.");
    } catch (IOException e) {
      throw new BadConfigurationException("Error reading configuration file", e);
    }
  }

  public int getShutdownPort() {
    return shutdownPort;
  }

  public int getActivityThreadCount() {
    return activityThreadCount;
  }

  public String getDbUsername() {
    return dbUsername;
  }

  public String getDbPassword() {
    return dbPassword;
  }
  
  public String getDbHostname() {
    return dbHostname;
  }
  
  public String getDbName() {
    return dbName;
  }
  
  public String getClientId() {
    return clientId;
  }
  
  public String getDevKey() {
    return devKey;
  }

}
