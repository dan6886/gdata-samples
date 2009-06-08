package com.google.youtube.example.uberactivityviewer;

import java.io.IOException;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.locks.Lock;

import org.apache.log4j.Logger;

public class Daemon {

  private static Logger log = Logger.getLogger(Daemon.class);

  private ConfigData config;
  private BlockingQueue<String> queue;
  private ConcurrentMap<String, Lock> userLocks;

  public Daemon() {
    this.queue = new LinkedBlockingQueue<String>();
    this.userLocks = new ConcurrentHashMap<String, Lock>();
    this.config = new ConfigData();
  }

  private void loadConfigFile(String filePath) throws BadConfigurationException {
    config.parseConfigFile(filePath);
  }

  public void run() {

    int activityThreadCount = config.getActivityThreadCount();
    Thread supFetcher;
    Thread[] activityFetchers = new Thread[activityThreadCount];

    log.info("Spooling up SUP thread and " + activityThreadCount
        + " activity threads.");

    try {
      supFetcher = new Thread(new SupFetcher(config, queue));
      supFetcher.start();
  
      for (int i = 0; i < activityThreadCount; i++) {
        activityFetchers[i] = new Thread(new ActivityFetcher(config, queue,
            userLocks));
        activityFetchers[i].start();
      }
    } catch (DatabaseException e) {
      log.fatal("Database configuration error!", e);
      return;
    }

    try {
      // Accept connections only on the local loopback (127.0.0.1)
      ServerSocket shutdownSocket = new ServerSocket(config.getShutdownPort(),
          0, InetAddress.getByName(null));
      shutdownSocket.accept();
    } catch (IOException e1) {
      log.error("Problems connecting to shutdown port");
    }

    supFetcher.interrupt();

    for (int i = 0; i < activityThreadCount; i++) {
      activityFetchers[i].interrupt();
    }

    try {
      supFetcher.join();
      for (int i = 0; i < activityThreadCount; i++) {
        activityFetchers[i].join();
      }
    } catch (InterruptedException e) {
      log.info("Shutting down...");
      return;
    }
  }

  /**
   * @param args
   */
  public static void main(String[] args) {
    Daemon d = new Daemon();
    if (args.length < 1) {
      System.out.println("Required argument: [app-config-file]");
      return;
    }

    try {
      d.loadConfigFile(args[0]);
    } catch (BadConfigurationException e) {
      System.out.println(e.getMessage());
      return;
    }

    d.run();

    log.info("Last goodbye...");

  }
}
