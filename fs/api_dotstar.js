/* 2017 Copyright (c) Tekt Industries. All rights reserved.

  Mongoose OS Dotstar LED library API.
  Author: Jonathon Grigg, November 2017
*/
load("api_spi.js");
load("api_sys.js");

let DotStar = {
  RGB: 0,
  GRB: 1,
  BGR: 2,

  // NOTE: 8MHz clock required

  // ## **`DotStar.create(pin, numPixels, order)`**
  // Create and return a DotStar strip object.
  // ```javascript
  // let numPixels = 6, colorOrder = DotStar.GRB;
  // let strip = DotStar.create(numPixels, colorOrder);
  // strip.setPixel(0 /* pixel */, 12, 34, 56);
  // strip.show();
  //
  // strip.clear();
  // strip.setPixel(1 /* pixel */, 12, 34, 56);
  // strip.show();
  // ```
  create: function(numPixels, order) {
    let s = Object.create({
      len: numPixels * 3,   // 3 colours per LED
      // Note: memory allocated here is currently not released.
      // This should be ok for now, we don't expect strips to be re-created.
      data: Sys.malloc(numPixels * 3),
      order: order,
      setPixel: DotStar.set,
      clear: DotStar.clear,
      show: DotStar.show,
    });
    s.clear();
    return s;
  },

  // ## **`strip.setPixel(i, r, g, b)`**
  // Set i-th's pixel's RGB value.
  // Note that this only affects in-memory value of the pixel.
  set: function(i, r, g, b) {
    let v0, v1, v2;
    if (this.order === DotStar.RGB) {
      v0 = r; v1 = g; v2 = b;
    } else if (this.order === DotStar.GRB) {
      v0 = g; v1 = r; v2 = b;
    } else if (this.order === DotStar.BGR) {
      v0 = b; v1 = g; v2 = r;
    } else {
      return;
    }
    this.data[i * 3] = v0;
    this.data[i * 3 + 1] = v1;
    this.data[i * 3 + 2] = v2;
  },

  // ## **`strip.clear()`**
  // Clear in-memory values of the pixels.
  clear: function() {
    for (let i = 0; i < this.len; i++) {
      this.data[i] = 0;
    }
  },

  // ## **`strip.show()`**
  // Output values of the pixels.
  show: function() {
    let buf = Sys.malloc(4);    // only ever send 4 byte chunks
    // first send four byte start-frame marker
    for (let i = 0; i < 4; i++) {
      buf[i] = 0;
    }
    let params = {
      cs: -1,
      mode: 0,
      freq: 8000000,  // 8MHz
      hd: {
        tx_data: buf,
        tx_len: 4,
      },
    };
    SPI.runTransaction(SPI.get(), params);
    // TODO: add brightness support
    // for each pixel
    for (let i = 0; i < this.len; i += 3) {
      // send pixel start byte followed by RGB data
      buf[0] = 255;
      buf[1] = this.data[i];
      buf[2] = this.data[i + 1];
      buf[3] = this.data[i + 2];
      params = {
        cs: -1,
        mode: 0,
        freq: 8000000,
        hd: {
          tx_data: buf,
          tx_len: 4,
        },
      };
      SPI.runTransaction(SPI.get(), params);
    }
    // finally send a four byte end-frame marker
    for (let i = 0; i < 4; i++) {
      buf[i] = 255;
    }
    params = {
      cs: -1,
      mode: 0,
      freq: 8000000,
      hd: {
        tx_data: buf,
        tx_len: 4,
      },
    };
    SPI.runTransaction(SPI.get(), params);
  },
};
