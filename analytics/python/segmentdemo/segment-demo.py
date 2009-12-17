from __future__ import division
#!/usr/bin/python
#
# Copyright 2009 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Google Analytics API advaced segment visualization.

This application retrieves data from the Google Analytics Data Export API
for a set of metrics across various segments. It then uses the Google Chart
API to visualize each set of metrics as bar charts. Finally all charts are
outputted as one larger image with a title and legend.

  To use this application with your own data:
      This sample has dependencies on a few 3rd party libraries. They
      must be referenced for this application to work.

      One MUST supply the Google Account username, password and Google
      Analytics API table ID (format ga:1234).

  To customize the layout, metrics or charts displayed:
      Simply by modify the parameters in the MakeEngagementImage method.

  Dependencies:
    GChartWrapper: a Python wrapper for the Google Chart API
        http://code.google.com/p/google-chartwrapper/
    gdata.analytics.clientL Google Data API Python client library
        http://code.google.com/p/gdata-python-client/
    Image, ImageDraw, ImageFont: Python Imaging Library
        http://www.pythonware.com/products/pil/
    A true type font (currently set to monaco.ttf). It's name should be set
        in the IMG_TITLE_FONT configuration member.

  Class SegmentDemo: Outputs a chart with metrics for various segments.
"""

__author__ = 'api.nickm@google.com (Nick Mihailovski)'


import GChartWrapper
import gdata.analytics.client
import Image
import ImageDraw
import ImageFont
from datetime import datetime


def main():
  """Main function for this application."""

  demo = SegmentDemo()
  demo.MakeEngagementImage()


class SegmentDemo(object):
  """Retrieves segment data from the Google Analytics API.

  Update USERNAME, PASSWORD and TABLE_ID with your own
  credentials to run this analysis across your data.

  See MakeEngagementDemo to customize what the charts report.

  Attributes:
    my_client: The Google Analytics API Python client library.
    query_uri: The query to use to make requests to the API.
    segments: The set of segments to make queries with.
    chart_data: Data to be displayed in each chart.
  """

  # Configuration options.
  USERNAME = 'INSERT YOUR GOOGLE ACCOUNT EMAIL HERE'
  PASSWORD = 'INSERT YOUR PASSWORD HERE'
  TABLE_ID = 'INSERT_YOUR_TABLE_ID (format ga:1234)'

  SOURCE_APP_NAME = 'Google-segmentDemo-v1'

  IMG_X_MARGIN = 15
  IMG_Y_MARGIN = 15
  IMG_TITLE_COLOR = '#999999'
  IMG_TITLE_FONT = 'monaco.ttf'
  IMG_TITLE_HEIGHT = 40

  CHARTS_PER_LINE = 3
  CHART_WIDTH = 158
  CHART_HEIGHT = 125
  CHART_MARGIN_TOP = 20
  CHART_MARGIN_LEFT = 20
  CHART_BAR_COLORS = ['F67749', '0F6899', '9EC4D9','429ECF', 'D2E1E8']

  LEGEND_HEIGHT = 90

  def __init__(self):
    """Inits SegmentDemo.

    creates a AnalyticsClient object that can be used to query the Google
    Analytics API.
    """

    self.my_client = gdata.analytics.client.AnalyticsClient(source=self.SOURCE_APP_NAME)
    self.my_client.client_login(
        self.USERNAME,
        self.PASSWORD,
        self.SOURCE_APP_NAME,
        service='analytics')

  def MakeEngagementImage(self):
    """Makes an image to display engagement data.

    This function defines the title and output file name. It also defines a set
    of segments to retrieve the metrics across. These represent each bar in the
    chart. It also defines each chart name as well as a function used to
    calclate the data for each chart. Users can simply modify any of the data in
    this method to update what data the image displays. Finally this method
    goes and retriebes al the data and create the final image.
    """

    # The image title.
    self.IMG_TITLE = '"Engagement" for www.kaushik.net'

    # The image output file.
    self.OUTPUT_FILE_NAME = 'engagementImage'

    # The query defining the date range and and metrics to retrieve form the API.
    # Add new metrics here to reference them in the chart calculations below.
    self.query_uri = gdata.analytics.client.DataFeedQuery({
      'ids': self.TABLE_ID,
      'start-date': '2009-10-01',
      'end-date': '2009-10-14',
      'metrics': 'ga:visits,ga:pageviews,ga:entrances,ga:bounces,ga:timeOnSite,ga:newVisits'})

    # Specify the segments of visits. The first parameter is used in the chart legend.
    self.segments = (
      ('All Visits', 'gaid::-1'),
      ('Visits From Facebook', 'dynamic::ga:source=~facebook'),
      ('Visits From Twitter', 'dynamic::ga:source=~twitter'))

    # A List to hold all the chart names and their calculated metrics.
    # New charts can be added just by adding entries to this list.
    self.chart_data = [
      ['Total Visits (#)', lambda d: d['ga:visits']],
      ['Pages Per Visit (#)', lambda d: d['ga:pageviews'] / d['ga:visits']],
      ['Avg Time on Site (s)', lambda d: d['ga:timeOnSite'] / d['ga:visits']],
      ['Bounce Rate (%)', lambda d: d['ga:bounces'] / d['ga:entrances'] * 100],
      ['Return Visits (%)', lambda d: (d['ga:visits'] - d['ga:newVisits']) / d['ga:visits'] * 100]]

    self.GetApiData()
    self.MakeChartImg()

  def GetApiData(self):
    """Makes seperate requests to the Google Analytics API for each segment."""

    for segment in self.segments:
      self.query_uri.query['segment'] = segment[1]
      api_data = self.my_client.GetDataFeed(self.query_uri)
      self.HandleApiData(api_data)

  def HandleApiData(self, api_data):
    """Formats data returned form the API into chart data.

    This method extracts all the metrics returned from the api and converts the
    values to floats. It then goes through each of the defined calculated and
    appends the result to each list in chart_data.

    Args:
      api_data: The data feed returned form the Google Analytics API.
    """

    for entry in api_data.entry:
      # Create a dictionary of each metric to simplify access.
      data = {}
      mets = self.query_uri.query['metrics'].split(',')
      for met in mets:
        data[met] = float(entry.get_object(met).value)

      # Perform the calculations for this data.
      for chart in self.chart_data:
        chart.append(chart[1](data))

  def MakeChartImg(self):
    """Prints one image with all the charts of data."""

    y = self.IMG_Y_MARGIN
    img_size = self.GetImageSize()
    img = Image.new('RGB', img_size, 'white')

    # Lays out each part of the image from top to bottom.
    self.SetImgTitle(img, img_size, y)

    img.save(self.OUTPUT_FILE_NAME + '.png', 'PNG')

  def GetImageSize(self):
    """Returns the size of the final image.

    Returns:
      A tuple with the width and height of the final.
    """

    num_imgs = len(self.chart_data)

    # Get image width.
    width = self.CHART_WIDTH + self.CHART_MARGIN_LEFT
    img_width = width * self.CHARTS_PER_LINE
    if num_imgs < self.CHARTS_PER_LINE:
      img_width = width * num_imgs
    img_width += self.IMG_X_MARGIN * 2

    # Get image height.
    multiplier = ((num_imgs - 1) // self.CHARTS_PER_LINE) + 1
    img_height = (self.CHART_HEIGHT + self.CHART_MARGIN_TOP) * multiplier
    img_height += self.IMG_Y_MARGIN * 3
    img_height += self.LEGEND_HEIGHT + self.IMG_TITLE_HEIGHT

    return (img_width, img_height)

  def SetImgTitle(self, img, img_size, y):
    """Adds a title contered to the image's width.

    Args:
      img: a Python Image Libaray Image instance.
      img_size: a tuple of the width and height of the final image.
      y: the current height position in the image.
    """

    draw = ImageDraw.Draw(img)

    # Print top title.
    top_font = ImageFont.truetype(self.IMG_TITLE_FONT, 18)
    top_title_size = top_font.getsize(self.IMG_TITLE)
    x = img_size[0]/2 - top_title_size[0]/2
    draw.text((x, y), self.IMG_TITLE, font=top_font, fill=self.IMG_TITLE_COLOR)
    y += top_title_size[1] + 5

    # Print sub title as a formatted date range.
    dates = [datetime.strptime(d, '%Y-%m-%d') for d in (
        self.query_uri.query['start-date'],
        self.query_uri.query['end-date']
    )]
    sub_title = ' - '.join([d.strftime('%b-%d-%Y') for d in dates])
    sub_font = ImageFont.truetype(self.IMG_TITLE_FONT, 12)
    sub_title_size = sub_font.getsize(sub_title)
    x = img_size[0]/2 - sub_title_size[0]/2
    draw.text((x, y), sub_title, font=sub_font, fill=self.IMG_TITLE_COLOR)
    self.SetImgCharts(img, y)

  def SetImgCharts(self, img, y):
    """Adds all the charts to the image.

    Args:
      img: a Python Image Libaray Image instance.
      y: the current height position in the image.
    """

    i = 0
    x = self.IMG_X_MARGIN
    y += self.IMG_TITLE_HEIGHT #+ self.IMG_Y_MARGIN
    for data in self.chart_data:
      # For new line of charts.
      if i > 0 and i % self.CHARTS_PER_LINE == 0:
        y += self.CHART_HEIGHT + self.CHART_MARGIN_TOP
        x = self.IMG_X_MARGIN

      chart = self.GetBarChart(data[0], data[2:])
      img.paste(chart, (x, y))

      x += self.CHART_WIDTH + self.CHART_MARGIN_LEFT
      i += 1

    self.SetImgLegend(img, y)

  def SetImgLegend(self, img, y):
    """Adds all the charts to the image.

    Args:
      img: a Python Image Libaray Image instance.
      y: the current height position in the image.
    """

    y += self.CHART_HEIGHT + self.CHART_MARGIN_TOP
    img.paste(self.GetChartLegend(), (self.IMG_X_MARGIN, y))

  def GetBarChart(self, title, data):
    """Returns data as a Google Chart.

    Args:
      title: The title of the individual chart.
      data: A list of data to print.

    Returns:
      A Python Imaging Library instance of the Google Chart.
    """

    tmpList = list(data)
    tmpList.reverse()

    # Scale all data by 100 in case we're printing decimals.
    data = [d * 100 for d in data]
    padding = (max(data) - min(data)) * .75

    chart = GChartWrapper.HorizontalBarGroup(data)
    chart.color('|'.join(self.CHART_BAR_COLORS))
    chart.title(title)
    chart.scale(min(data) / 2, max(data) + padding)
    #chart.scale(min(data), max(data) + padding)
    chart.axes('y')
    # Each label should have at most 2 decimal percision.
    chart.axes.label(0, *['%.1f' % (x) for x in tmpList])
    chart.axes.style(0, '000000')
    chart.size(self.CHART_WIDTH, self.CHART_HEIGHT)
    # Used to hide the X axis.
    chart.marker('R', 'ffffff', 0, 0.99, 1.02, 1)
    return chart.image()

  def GetChartLegend(self):
    """Returns the legend as an image.

    First creates a new chart with fake data and a legend. Then crops the
    chart to only keep the remaining legend.

    Returns:
      A Python Imaging Library instance of the legend.
    """

    # Make some fake data.
    data = [i for i, v in enumerate(self.segments)]

    # Get chart as a PIL instance.
    chart = GChartWrapper.HorizontalBarGroup(data)
    chart.title('Legend')
    #chart.legend(*self.legend)
    chart.legend(*[seg[0] for seg in self.segments])
    chart.legend_pos('tv')
    chart.size(500, 200)
    chart.color('|'.join(self.CHART_BAR_COLORS))
    img = chart.image()

    # Crop out the legend.
    width = img.size[0]
    return img.crop((0,0, width, self.LEGEND_HEIGHT))


if __name__ == '__main__':
  main()
